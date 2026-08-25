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
import { Easing, springEase } from './motion/easing.js'
import { prefersReducedMotion } from './env.js'
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
    }
    const lock = createPageLock()
    const nodes = new Map()
    const enterEase = springEase(0.58, -3.5)
    let layer = null
    let unsubscribe = null
    let onRemoved = null

    function configure(patch = {}) {
        const { morph, ...rest } = patch
        Object.assign(config, rest)
        if (morph) Object.assign(config.morph, morph)
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
            if (item.id === skipId || node.morphing) return
            motionOf(node.dialog).to(
                top ? { scale: 1, y: 0 } : { scale: config.underScale, y: config.underY },
                { duration: config.underDuration, ease: Easing.easeOutCubic },
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

        if (item.labelledBy) {
            dialog.setAttribute('aria-labelledby', item.labelledBy)
        } else {
            const title = body.querySelector('.apr-title')
            if (title?.id) dialog.setAttribute('aria-labelledby', title.id)
            else if (item.ariaLabel) dialog.setAttribute('aria-label', item.ariaLabel)
            else if (item.title) dialog.setAttribute('aria-label', item.title)
        }

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
            morph: null,
        }
        nodes.set(item.id, node)

        if (nodes.size === 1) lock.acquire(layer, item.origin)
        motionOf(overlay).set({ opacity: 0 })
        void itemEl.offsetWidth

        const origin = item.origin
        const morph = canMorphFrom(origin)

        const finish = () => {
            node.morphing = false
            node.morph = null
            restack()
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
                options: config.morph,
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

        const { overlay, dialog, shell, body, origin, originHidden } = node
        const reverse = originHidden && canMorphFrom(origin)

        let finished = false
        const finish = () => {
            if (finished) return
            finished = true
            clearTimeout(safety)
            node.cleanupContent?.()
            killMotion(overlay)
            killMotion(dialog)
            node.itemEl.remove()
            nodes.delete(item.id)
            const result = store.remove(item.id)
            if (originHidden && origin) restoreOrigin(origin, { instant: true })
            if (nodes.size === 0) lock.release()
            else restack()
            onRemoved?.(item.id, result)
        }
        const safety = setTimeout(finish, (config.morph.closeMaxDuration ?? 480) + 80)

        fadeOverlay(overlay, 0, reverse ? config.overlayDuration * 0.8 : config.exitDuration)

        if (reverse) {
            node.morph = morphToOrigin({
                dialogEl: dialog,
                shellEl: shell,
                bodyEl: body,
                origin,
                originStyle: item.originStyle,
                options: config.morph,
                onSettle: finish,
            })
            node.originHidden = false
            return
        }

        if (originHidden && origin) {
            restoreOrigin(origin, { instant: true })
            node.originHidden = false
        }
        slideOut(dialog, finish)
    }

    function sync(items = store.getItems()) {
        ensureMounted()
        for (const item of items) {
            if (!item.closing && !nodes.has(item.id)) enter(item)
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
