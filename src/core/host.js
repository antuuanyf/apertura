/**
 * The host: builds the DOM, runs the morph, owns focus and the overlay.
 *
 * Vanilla on purpose. A framework adapter would render the same tree and call
 * the same enter/leave; until then this is the whole surface.
 */

import { fillBody } from './card.js'
import { createPageLock, focusFirst } from './lock.js'
import { morphFromOrigin, morphToOrigin, restoreOrigin, MORPH_DEFAULTS } from './morph.js'
import { motionOf, killMotion } from './motion/element.js'
import { createMotion, spring } from './motion/engine.js'
import { Easing, springEase } from './motion/easing.js'
import { prefersReducedMotion } from './env.js'
import { resolveMorph, applySize } from './presets.js'
import { layoutSlot, resolvePlacement, trackOrigin } from './placement.js'
import { attachDismissGesture } from './gesture.js'
import './styles.css'

export const HOST_DEFAULTS = {
    overlayDuration: 0.35,
    enterDuration: 0.5,
    enterDistance: 16,
    enterScale: 0.94,
    enterBlur: 8,
    exitDuration: 0.28,
    exitDistance: 10,
    exitBlur: 4,
    underScale: 0.96,
    underY: 10,
    underDuration: 0.4,
    underSpring: { stiffness: 180, damping: 22, velocity: 0 },
    placementGap: 8,
    placementPadding: 16,
    morph: MORPH_DEFAULTS,
}

function canMorphFrom(origin) {
    return origin instanceof HTMLElement
        && origin.isConnected
        && !prefersReducedMotion()
        && origin.getBoundingClientRect().width > 0
}

export function createModalHost({ store, options = {}, mountTo = 'body' } = {}) {
    const config = {
        ...HOST_DEFAULTS,
        ...options,
        morph: { ...MORPH_DEFAULTS, ...(options.morph ?? {}) },
        underSpring: { ...HOST_DEFAULTS.underSpring, ...(options.underSpring ?? {}) },
    }
    const lock = createPageLock()
    const nodes = new Map()
    const enterEase = springEase(0.58, -3.5)
    let layer = null
    let unsubscribe = null
    let onRemoved = null

    function configure(patch = {}) {
        const { morph, underSpring, ...rest } = patch
        Object.assign(config, rest)
        if (morph) Object.assign(config.morph, morph)
        if (underSpring) Object.assign(config.underSpring, underSpring)
    }

    function morphFor(item) {
        return resolveMorph(item?.morph, config.morph)
    }

    function targetOf() {
        if (mountTo instanceof HTMLElement) return mountTo
        return document.querySelector(mountTo) ?? document.body
    }

    function ensureMounted() {
        if (layer || typeof document === 'undefined') return
        layer = document.createElement('div')
        layer.className = 'apr-layer'
        layer.setAttribute('aria-live', 'off')
        targetOf().append(layer)
        document.addEventListener('keydown', onKeyDown)
    }

    function onKeyDown(event) {
        if (event.key !== 'Escape') return
        const top = [...store.getItems()].reverse().find((item) => !item.closing)
        if (!top || !top.dismissible) return
        event.preventDefault()
        store.close(top.id)
    }

    function liveNodes() {
        return store.getItems()
            .filter((item) => !item.closing)
            .map((item) => ({ item, node: nodes.get(item.id) }))
            .filter((entry) => entry.node)
    }

    function restack({ skipId = null } = {}) {
        const live = liveNodes()
        live.forEach(({ item, node }, index) => {
            const top = index === live.length - 1
            node.itemEl.inert = !top
            if (item.id === skipId || node.morphing || node.dragging) return
            motionOf(node.dialog).to(
                top ? { scale: 1, y: 0 } : { scale: config.underScale, y: config.underY },
                { spring: config.underSpring },
            )
        })
    }

    function fadeOverlay(overlay, opacity, duration = config.overlayDuration) {
        motionOf(overlay).to({ opacity }, {
            duration: prefersReducedMotion() ? 0 : duration,
            ease: Easing.easeOutCubic,
        })
    }

    function slideIn(dialog, done) {
        const motion = motionOf(dialog)
        motion.set({
            y: config.enterDistance,
            scale: config.enterScale,
            opacity: 0,
            blur: config.enterBlur,
        })
        motion.to({ y: 0, scale: 1, opacity: 1, blur: 0 }, {
            duration: config.enterDuration,
            ease: enterEase,
            onComplete: done,
        })
    }

    function slideOut(dialog, done) {
        const motion = motionOf(dialog)
        motion.kill()
        motion.to({
            y: motion.get('y') + config.exitDistance,
            scale: Math.min(config.enterScale, 0.92),
            opacity: 0,
            blur: config.exitBlur,
        }, {
            duration: config.exitDuration,
            ease: Easing.easeInCubic,
            onComplete: done,
        })
    }

    function place(node, item) {
        const placement = resolvePlacement(item.placement, item.origin)
        node.placement = placement
        applySize(node.dialog, item.size)
        if (placement === 'bottom' && item.size == null) {
            node.dialog.style.setProperty('--apr-max-width', 'min(480px, calc(100vw - 24px))')
        }
        layoutSlot(node.dialog, node.itemEl, item.origin, placement, {
            gap: config.placementGap,
            padding: config.placementPadding,
        })
    }

    function bindAria(dialog, body, item) {
        dialog.removeAttribute('aria-labelledby')
        dialog.removeAttribute('aria-label')
        if (item.labelledBy) {
            dialog.setAttribute('aria-labelledby', item.labelledBy)
            return
        }
        const title = body.querySelector('.apr-title')
        if (title?.id) dialog.setAttribute('aria-labelledby', title.id)
        else if (item.ariaLabel) dialog.setAttribute('aria-label', item.ariaLabel)
        else if (item.title) dialog.setAttribute('aria-label', item.title)
    }

    function startTracking(node, item) {
        node.untrack?.()
        node.untrack = null
        if (node.placement === 'center' || !item.origin) return

        node.untrack = trackOrigin(item.origin, () => {
            if (node.leaving) {
                const target = node.closeTarget ?? item.origin
                node.morph?.retarget?.(target)
                return
            }
            if (node.morphing || node.dragging) return
            const current = store.get(item.id)
            if (!current || current.closing) return
            layoutSlot(node.dialog, node.itemEl, current.origin, node.placement, {
                gap: config.placementGap,
                padding: config.placementPadding,
            })
        })
    }

    function attachGesture(node, item) {
        node.detachGesture?.()
        node.detachGesture = null
        const current = store.get(item.id) ?? item
        if (current.gesture === false) return
        node.detachGesture = attachDismissGesture({
            dialog: node.dialog,
            item,
            store,
            placement: node.placement,
            origin: item.origin,
            isBusy: () => node.morphing || node.leaving,
            onPull: (active) => { node.dragging = active },
        })
    }

    const LAYOUT_KEYS = ['apr-title', 'apr-description', 'apr-input', 'apr-actions']
    const SIZE_SPRING = { stiffness: 180, damping: 22, velocity: 0, restDelta: 0.5, restSpeed: 4 }

    function rectOf(el, shellRect) {
        const r = el.getBoundingClientRect()
        return {
            width: r.width,
            height: r.height,
            top: r.top - shellRect.top,
            left: r.left - shellRect.left,
        }
    }

    function snapshotLayout(body, shell) {
        const shellRect = shell.getBoundingClientRect()
        const shot = {}
        for (const key of LAYOUT_KEYS) {
            const el = body.querySelector(`.${key}`)
            if (el) shot[key] = rectOf(el, shellRect)
        }
        if (Object.keys(shot).length > 0) return shot
        const card = body.querySelector('.apr-card') ?? body
        ;[...card.children].forEach((el, i) => {
            shot[`n${i}`] = rectOf(el, shellRect)
        })
        return shot
    }

    function findLayoutEl(body, key) {
        if (!key.startsWith('n')) return body.querySelector(`.${key}`)
        const card = body.querySelector('.apr-card') ?? body
        return card.children[Number(key.slice(1))] ?? null
    }

    function pinContent(node, width) {
        const body = node.body
        body.style.alignSelf = 'flex-start'
        body.style.width = `${width}px`
        body.style.flex = '0 0 auto'
    }

    function unpinContent(node) {
        const body = node.body
        body.style.alignSelf = ''
        body.style.width = ''
        body.style.flex = ''
    }

    function unpinLayout(node) {
        for (const el of node.layoutPins ?? []) {
            el.style.height = ''
            el.style.overflow = ''
            el.style.flexShrink = ''
            el.style.boxSizing = ''
            el.style.transform = ''
        }
        node.layoutPins = []
    }

    function stopSizeMotion(node) {
        node.sizeMotion?.stop()
        node.sizeMotion = null
        unpinContent(node)
        unpinLayout(node)
    }

    function clearShellSize(node) {
        node.shell.style.width = ''
        node.shell.style.height = ''
    }

    function relayout(node) {
        if (node.placement === 'center' || node.leaving || !node.origin) return
        layoutSlot(node.dialog, node.itemEl, node.origin, node.placement, {
            gap: config.placementGap,
            padding: config.placementPadding,
        })
    }

    function measureTargets(node) {
        const shell = node.shell
        const prevWidth = shell.style.width
        const prevHeight = shell.style.height
        shell.style.width = ''
        shell.style.height = ''
        const rect = shell.getBoundingClientRect()
        const layout = snapshotLayout(node.body, shell)
        shell.style.width = prevWidth
        shell.style.height = prevHeight
        return { width: rect.width, height: rect.height, layout }
    }

    function pinLayoutEl(el, height) {
        el.style.boxSizing = 'border-box'
        el.style.height = `${height}px`
        el.style.overflow = 'hidden'
        el.style.flexShrink = '0'
    }

    function springHeight(node, from, fromLayout = {}) {
        stopSizeMotion(node)
        const shell = node.shell
        const body = node.body
        const to = measureTargets(node)
        const keys = new Set([...Object.keys(fromLayout), ...Object.keys(to.layout)])

        const heightHops = []
        for (const key of keys) {
            const el = findLayoutEl(body, key)
            const prev = fromLayout[key]
            const next = to.layout[key]
            if (!el || !next) continue
            const start = prev?.height ?? 0
            if (Math.abs(start - next.height) < 1) continue
            heightHops.push({ el, key, from: start, to: next.height })
        }

        const sizeChanged = Math.abs(from.width - to.width) >= 1
            || Math.abs(from.height - to.height) >= 1
        if (!sizeChanged && heightHops.length === 0) {
            clearShellSize(node)
            return
        }

        if (prefersReducedMotion()) {
            clearShellSize(node)
            relayout(node)
            return
        }

        pinContent(node, to.width)
        node.layoutPins = []
        for (const hop of heightHops) {
            pinLayoutEl(hop.el, hop.from)
            node.layoutPins.push(hop.el)
        }

        void body.offsetHeight
        const shellRect = shell.getBoundingClientRect()
        const shiftHops = []
        for (const key of keys) {
            const el = findLayoutEl(body, key)
            const prev = fromLayout[key]
            if (!el || !prev) continue
            const now = rectOf(el, shellRect)
            const dx = prev.left - now.left
            const dy = prev.top - now.top
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
            if (!node.layoutPins.includes(el)) node.layoutPins.push(el)
            shiftHops.push({ el, key, x: dx, y: dy })
        }

        shell.style.width = `${from.width}px`
        shell.style.height = `${from.height}px`

        const initial = { width: from.width, height: from.height }
        const targets = { width: to.width, height: to.height }
        const heights = Object.fromEntries(heightHops.map((hop) => [`h:${hop.key}`, hop.el]))
        const shifts = new Map()
        for (const hop of heightHops) {
            initial[`h:${hop.key}`] = hop.from
            targets[`h:${hop.key}`] = hop.to
        }
        for (const hop of shiftHops) {
            initial[`x:${hop.key}`] = hop.x
            initial[`y:${hop.key}`] = hop.y
            targets[`x:${hop.key}`] = 0
            targets[`y:${hop.key}`] = 0
            shifts.set(hop.el, { x: hop.x, y: hop.y })
            hop.el.style.transform = `translate(${hop.x}px, ${hop.y}px)`
        }

        const shiftByChannel = {}
        for (const hop of shiftHops) {
            shiftByChannel[`x:${hop.key}`] = hop.el
            shiftByChannel[`y:${hop.key}`] = hop.el
        }

        const pending = new Set(Object.keys(targets))
        const hop = spring(SIZE_SPRING)
        const transitions = Object.fromEntries([...pending].map((key) => [key, hop]))
        const motion = createMotion(initial, {
            onChange(key, value) {
                if (key === 'width' || key === 'height') {
                    shell.style[key] = `${value}px`
                } else if (key.startsWith('h:')) {
                    heights[key].style.height = `${value}px`
                } else {
                    const el = shiftByChannel[key]
                    const state = el && shifts.get(el)
                    if (state) {
                        if (key.startsWith('x:')) state.x = value
                        else state.y = value
                        el.style.transform = `translate(${state.x}px, ${state.y}px)`
                    }
                }
                relayout(node)
            },
            onSettle(key) {
                pending.delete(key)
                if (pending.size > 0 || node.sizeMotion !== motion) return
                stopSizeMotion(node)
                clearShellSize(node)
                relayout(node)
            },
        })
        node.sizeMotion = motion
        motion.animate(targets, transitions)
    }

    function refresh(item) {
        const node = nodes.get(item.id)
        if (!node || node.leaving || node.morphing) return
        if (node.rev === item.rev) return
        node.rev = item.rev

        const fromLayout = snapshotLayout(node.body, node.shell)
        const from = {
            width: node.shell.getBoundingClientRect().width,
            height: node.shell.getBoundingClientRect().height,
        }
        node.shell.style.width = `${from.width}px`
        node.shell.style.height = `${from.height}px`

        node.cleanupContent?.()
        node.body.replaceChildren()
        const close = (result) => store.close(item.id, result)
        node.cleanupContent = fillBody(node.body, item, { close, id: item.id })
        bindAria(node.dialog, node.body, item)
        node.origin = item.origin
        place(node, item)
        startTracking(node, item)
        attachGesture(node, item)
        springHeight(node, from, fromLayout)
    }

    function enter(item) {
        ensureMounted()
        if (nodes.has(item.id)) return

        const itemEl = document.createElement('div')
        itemEl.className = 'apr-item'
        itemEl.dataset.aprId = String(item.id)

        const overlay = document.createElement('div')
        overlay.className = 'apr-overlay'
        overlay.dataset.aprOverlay = ''

        const dialog = document.createElement('div')
        dialog.className = 'apr-dialog'
        dialog.setAttribute('role', 'dialog')
        dialog.setAttribute('aria-modal', 'true')
        dialog.tabIndex = -1

        const shell = document.createElement('div')
        shell.className = 'apr-shell'
        shell.dataset.aprShell = ''

        const body = document.createElement('div')
        body.className = 'apr-body'
        body.dataset.aprBody = ''

        const close = (result) => store.close(item.id, result)
        const cleanupContent = fillBody(body, item, { close, id: item.id })
        bindAria(dialog, body, item)

        shell.append(body)
        dialog.append(shell)
        itemEl.append(overlay, dialog)
        layer.append(itemEl)

        overlay.addEventListener('click', (event) => {
            if (event.target !== overlay) return
            const current = store.get(item.id)
            if (current?.dismissible) store.close(item.id)
        })

        const node = {
            itemEl,
            overlay,
            dialog,
            shell,
            body,
            cleanupContent,
            origin: item.origin,
            originHidden: false,
            morphing: false,
            leaving: false,
            dragging: false,
            morph: null,
            sizeMotion: null,
            layoutPins: [],
            untrack: null,
            detachGesture: null,
            closeTarget: null,
            placement: 'center',
            rev: item.rev ?? 0,
        }
        nodes.set(item.id, node)
        place(node, item)

        if (nodes.size === 1) lock.acquire(layer, item.origin)
        motionOf(overlay).set({ opacity: 0 })
        void itemEl.offsetWidth
        place(node, item)

        const origin = item.origin
        const morph = canMorphFrom(origin)
        const morphOptions = morphFor(item)

        const finish = () => {
            node.morphing = false
            node.morph = null
            startTracking(node, item)
            attachGesture(node, item)
            if (!node.leaving) restack()
            const latest = store.get(item.id)
            if (latest && !latest.closing && latest.rev !== node.rev) refresh(latest)
            if (!node.leaving) focusFirst(dialog)
        }

        if (morph) {
            node.morphing = true
            node.originHidden = true
            node.morph = morphFromOrigin({
                dialogEl: dialog,
                shellEl: shell,
                bodyEl: body,
                origin,
                originStyle: item.originStyle,
                options: morphOptions,
                onSettle: finish,
            })
        } else {
            slideIn(dialog, finish)
        }

        fadeOverlay(overlay, 1)
        restack({ skipId: item.id })
        dialog.focus({ preventScroll: true })
    }

    function leave(item) {
        const node = nodes.get(item.id)
        if (!node || node.leaving) return
        node.leaving = true
        node.morph?.settle()
        node.morph = null
        node.morphing = false
        node.detachGesture?.()
        node.detachGesture = null
        stopSizeMotion(node)

        const { overlay, dialog, shell, body, origin, originHidden } = node
        const morphOptions = morphFor(item)
        const closeTarget = canMorphFrom(item.closeOrigin) ? item.closeOrigin : origin
        const reverse = originHidden && canMorphFrom(closeTarget)
        const handoffDuration = reverse
            ? Math.max(0, Number(morphOptions.closeHandoffDuration) || 0)
            : 0
        // Keep an underlying dialog at its current stack scale while the
        // closing shell measures and flies into an origin inside it.
        if (!reverse) restack()
        node.closeTarget = closeTarget

        let finished = false
        const finish = () => {
            if (finished) return
            finished = true
            clearTimeout(safety)
            node.untrack?.()
            node.untrack = null
            node.cleanupContent?.()
            killMotion(overlay)
            killMotion(dialog)
            node.itemEl.remove()
            nodes.delete(item.id)
            const result = store.remove(item.id)
            if (origin) restoreOrigin(origin, { instant: true })
            if (closeTarget && closeTarget !== origin) restoreOrigin(closeTarget, { instant: true })
            if (nodes.size === 0) lock.release()
            else restack()
            onRemoved?.(item.id, result)
        }
        const safety = setTimeout(
            finish,
            (morphOptions.closeMaxDuration ?? 480) + handoffDuration * 1000 + 80,
        )

        fadeOverlay(overlay, 0, reverse ? config.overlayDuration * 0.8 : config.exitDuration)

        if (reverse) {
            if (closeTarget !== origin && originHidden && origin) {
                restoreOrigin(origin, { instant: true })
                node.originHidden = false
                hideOriginForClose(closeTarget)
            }
            node.morph = morphToOrigin({
                dialogEl: dialog,
                shellEl: shell,
                bodyEl: body,
                origin: closeTarget,
                originStyle: closeTarget === origin ? item.originStyle : null,
                options: morphOptions,
                onSettle: () => {
                    if (closeTarget !== origin) restoreOrigin(closeTarget, { instant: true })
                    finish()
                },
            })
            if (closeTarget === origin) node.originHidden = false
            return
        }

        if (originHidden && origin) {
            restoreOrigin(origin, { instant: true })
            node.originHidden = false
        }
        slideOut(dialog, finish)
    }

    function hideOriginForClose(element) {
        if (!(element instanceof HTMLElement)) return
        element.style.transition = 'none'
        element.style.opacity = '0'
        element.style.pointerEvents = 'none'
    }

    function sync(items = store.getItems()) {
        ensureMounted()
        for (const item of items) {
            if (!item.closing && !nodes.has(item.id)) enter(item)
            else if (!item.closing && nodes.has(item.id)) refresh(item)
            if (item.closing && nodes.has(item.id)) leave(item)
        }
    }

    function mount() {
        if (unsubscribe) return
        ensureMounted()
        unsubscribe = store.subscribe(sync)
        sync()
    }

    function destroy() {
        unsubscribe?.()
        unsubscribe = null
        for (const node of [...nodes.values()]) {
            node.morph?.settle()
            node.untrack?.()
            node.detachGesture?.()
            stopSizeMotion(node)
            node.cleanupContent?.()
            if (node.originHidden && node.origin) restoreOrigin(node.origin)
            killMotion(node.overlay)
            killMotion(node.dialog)
            node.itemEl.remove()
        }
        nodes.clear()
        document.removeEventListener('keydown', onKeyDown)
        lock.destroy()
        layer?.remove()
        layer = null
    }

    return {
        mount,
        destroy,
        configure,
        sync,
        ensureMounted,
        set onRemoved(fn) { onRemoved = fn },
    }
}
