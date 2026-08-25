/**
 * The morph: the button that opened the dialog becomes the dialog, and on
 * close the dialog becomes the button again.
 *
 * Same trick as super-beautiful-toast. The box you watch grow never distorts;
 * the content, which would, stays hidden and blurred until the skin has almost
 * arrived. x and y are independent springs with an initial kick; width and
 * height are springs without that kick (a size launch explodes the box);
 * roundness is a short tween so a pill does not oscillate; colour and shadow
 * go through CSS transitions.
 *
 * Roundness is a ratio of the current min(width, height), not a pixel radius.
 * A pill button reports `border-radius: 999px`. Tweening that number toward
 * 32px looks like a pill for almost the whole flight — anything above half the
 * short side still clips to a capsule — then squares off at the end. The ratio
 * (0.5 → 0.16) is what actually changes shape while the box grows.
 *
 * Close settles when the springs rest, not when a 1100ms safety net fires, and
 * the origin is restored instantly while the shell still covers it so the
 * button is labelled and clickable the moment the dialog is gone.
 */

import { createMotion, spring, easing } from './motion/engine.js'
import { Easing } from './motion/easing.js'

export const MORPH_DEFAULTS = {
    stiffness: 144,
    damping: 14,
    velocity: 2400,
    sizeStiffness: 180,
    sizeDamping: 22,
    sizeDuration: 0.32,
    /** Kept in lockstep with size so the shape changes while the box grows. */
    radiusDuration: 0.32,
    contentDuration: 0.32,
    colorDuration: 0.4,
    colorDelay: 0.15,
    shadowDuration: 0.6,
    shadowDelay: 0.05,
    contentScale: 2,
    contentBlur: 8,
    maxDuration: 1100,
    closeDamping: 20,
    closeSizeDamping: 26,
    closeVelocity: 1400,
    closeContentDuration: 0.16,
    closeMaxDuration: 480,
    closeRestDelta: 0.8,
    closeRestSpeed: 8,
}

export function hideOrigin(element) {
    if (!(element instanceof HTMLElement)) return
    element.style.transition = 'opacity 160ms ease'
    element.style.opacity = '0'
    element.style.pointerEvents = 'none'
}

export function restoreOrigin(element, { instant = false } = {}) {
    if (!(element instanceof HTMLElement)) return
    if (instant) {
        element.style.transition = 'none'
        element.style.opacity = ''
        element.style.pointerEvents = ''
        return
    }
    element.style.transition = 'opacity 300ms ease'
    element.style.opacity = ''
    element.style.pointerEvents = ''
    setTimeout(() => { element.style.transition = '' }, 320)
}

function transparentShadow(shadow) {
    if (!shadow || shadow === 'none') return shadow
    return shadow.replace(/rgba?\([^)]*\)/g, 'rgba(0,0,0,0)')
}

function minSide(width, height) {
    return Math.max(1, Math.min(width, height))
}

/**
 * Visual corner radius in px. `999px` and `50%` both mean "capsule" on a
 * short button; the number that actually paints is half the short side.
 */
function effectiveRadius(cssValue, width, height) {
    const cap = minSide(width, height) / 2
    const raw = String(cssValue ?? '').trim()
    if (!raw || raw === 'none') return 0
    if (raw.endsWith('%')) {
        return Math.min((parseFloat(raw) / 100) * minSide(width, height), cap)
    }
    const px = parseFloat(raw)
    if (!Number.isFinite(px)) return 0
    return Math.min(Math.max(0, px), cap)
}

function freezeSlot(dialogEl, shellEl, bodyEl) {
    const shellRect = shellEl.getBoundingClientRect()
    dialogEl.style.width = `${shellRect.width}px`
    dialogEl.style.height = `${shellRect.height}px`
    if (bodyEl) {
        bodyEl.style.width = `${bodyEl.getBoundingClientRect().width}px`
        bodyEl.style.flex = '0 0 auto'
    }
    return shellRect
}

function clearFrozen(dialogEl, shellEl, bodyEl) {
    for (const property of ['position', 'top', 'left', 'width', 'height', 'borderRadius',
        'background', 'boxShadow', 'transform', 'transition']) {
        shellEl.style[property] = ''
    }
    dialogEl.style.width = ''
    dialogEl.style.height = ''
    if (bodyEl) {
        for (const property of ['transform', 'transformOrigin', 'filter', 'opacity', 'width', 'flex', 'transition']) {
            bodyEl.style[property] = ''
        }
    }
}

function paintShell(shellStyle, state) {
    shellStyle.transform = `translate(${state.x}px, ${state.y}px)`
    shellStyle.width = `${state.width}px`
    shellStyle.height = `${state.height}px`
    shellStyle.borderRadius = `${state.roundness * minSide(state.width, state.height)}px`
}

function sizeSpring(config, { close = false } = {}) {
    return spring({
        stiffness: config.sizeStiffness,
        damping: close ? (config.closeSizeDamping ?? config.closeDamping) : config.sizeDamping,
        velocity: 0,
        restDelta: 0.4,
        restSpeed: 4,
    })
}

function roundnessEase(close) {
    return close ? Easing.bezier(0.5, 0.2, 0.2, 1) : Easing.bezier(0.8, 0.3, 0.5, 0.8)
}

/**
 * @returns {{ settle: () => void }}
 */
export function morphFromOrigin({ dialogEl, shellEl, bodyEl, origin, originStyle, options = {}, onSettle }) {
    const config = { ...MORPH_DEFAULTS, ...options }
    const shellRect = freezeSlot(dialogEl, shellEl, bodyEl)
    const originRect = origin.getBoundingClientRect()
    const originComputed = getComputedStyle(origin)
    const fromBackground = originStyle?.background ?? originComputed.background
    const fromShadow = originStyle?.boxShadow ?? originComputed.boxShadow
    const fromRoundness = effectiveRadius(
        originStyle?.borderRadius ?? originComputed.borderRadius,
        originRect.width,
        originRect.height,
    ) / minSide(originRect.width, originRect.height)

    const shellComputed = getComputedStyle(shellEl)
    const toBackground = shellComputed.background
    const toShadow = shellComputed.boxShadow
    const toRoundness = effectiveRadius(
        shellComputed.borderRadius,
        shellRect.width,
        shellRect.height,
    ) / minSide(shellRect.width, shellRect.height)
    const startShadow = transparentShadow(toShadow)

    const fromX = originRect.left - shellRect.left
    const fromY = originRect.top - shellRect.top
    const launchX = (originRect.left + originRect.width / 2) < window.innerWidth / 2 ? 1 : -1
    const launchY = (originRect.top + originRect.height / 2) < window.innerHeight / 2 ? 1 : -1

    const shellStyle = shellEl.style
    const state = {
        x: fromX,
        y: fromY,
        width: originRect.width,
        height: originRect.height,
        roundness: fromRoundness,
    }

    shellStyle.position = 'absolute'
    shellStyle.top = '0px'
    shellStyle.left = '0px'
    paintShell(shellStyle, state)
    shellStyle.background = fromBackground
    shellStyle.boxShadow = startShadow
    shellStyle.transition = 'none'

    if (bodyEl) {
        bodyEl.style.transform = `scale(${config.contentScale})`
        bodyEl.style.transformOrigin = 'center center'
        bodyEl.style.filter = `blur(${config.contentBlur}px)`
        bodyEl.style.opacity = '0'
    }

    hideOrigin(origin)

    void shellEl.offsetWidth
    shellStyle.transition = [
        `background ${config.colorDuration}s ease-out ${config.colorDelay}s`,
        `box-shadow ${config.shadowDuration}s ease-out ${config.shadowDelay}s`,
    ].join(', ')
    shellStyle.background = toBackground
    shellStyle.boxShadow = toShadow
    if (bodyEl) {
        bodyEl.style.transition = `opacity ${config.colorDuration}s ease-out ${config.colorDelay}s`
        bodyEl.style.opacity = '1'
    }

    const pending = new Set(['x', 'y', 'width', 'height', 'roundness', 'contentScale', 'contentBlur'])

    const motion = createMotion(
        {
            ...state,
            contentScale: config.contentScale,
            contentBlur: config.contentBlur,
        },
        {
            onChange(key, value) {
                if (key in state) {
                    state[key] = value
                    paintShell(shellStyle, state)
                    return
                }
                if (key === 'contentScale' && bodyEl) bodyEl.style.transform = `scale(${value})`
                if (key === 'contentBlur' && bodyEl) bodyEl.style.filter = `blur(${value}px)`
            },
            onSettle(key) {
                pending.delete(key)
                if (pending.size === 0) settle()
            },
        },
    )

    const travel = { stiffness: config.stiffness, damping: config.damping, velocity: config.velocity }
    const size = sizeSpring(config)
    motion.animate(
        {
            x: 0,
            y: 0,
            width: shellRect.width,
            height: shellRect.height,
            roundness: toRoundness,
            contentScale: 1,
            contentBlur: 0,
        },
        {
            x: spring({ ...travel, direction: launchX }),
            y: spring({ ...travel, direction: launchY }),
            width: size,
            height: size,
            roundness: easing({ duration: config.radiusDuration, ease: roundnessEase(false) }),
            contentScale: easing({ duration: config.contentDuration, ease: Easing.easeOut }),
            contentBlur: easing({ duration: config.contentDuration, ease: Easing.easeOut }),
        },
    )

    let settled = false
    const safety = setTimeout(() => settle(), config.maxDuration)

    function settle() {
        if (settled) return
        settled = true
        clearTimeout(safety)
        motion.stop()
        clearFrozen(dialogEl, shellEl, bodyEl)
        onSettle?.()
    }

    return { settle }
}

/**
 * Reverse morph: the dialog collapses back into the origin button.
 * @returns {{ settle: () => void, retarget: (origin: HTMLElement) => void }}
 */
export function morphToOrigin({ dialogEl, shellEl, bodyEl, origin, originStyle, options = {}, onSettle }) {
    const config = { ...MORPH_DEFAULTS, ...options }
    const shellRect = freezeSlot(dialogEl, shellEl, bodyEl)
    const originRect = origin.getBoundingClientRect()
    const originComputed = getComputedStyle(origin)
    const toBackground = originStyle?.background ?? originComputed.background
    const toRoundness = effectiveRadius(
        originStyle?.borderRadius ?? originComputed.borderRadius,
        originRect.width,
        originRect.height,
    ) / minSide(originRect.width, originRect.height)

    const shellComputed = getComputedStyle(shellEl)
    const fromShadow = shellComputed.boxShadow
    const fromRoundness = effectiveRadius(
        shellComputed.borderRadius,
        shellRect.width,
        shellRect.height,
    ) / minSide(shellRect.width, shellRect.height)
    const toShadow = transparentShadow(fromShadow)

    const toX = originRect.left - shellRect.left
    const toY = originRect.top - shellRect.top
    const launchX = Math.sign(toX) || 1
    const launchY = Math.sign(toY) || 1

    const shellStyle = shellEl.style
    const state = {
        x: 0,
        y: 0,
        width: shellRect.width,
        height: shellRect.height,
        roundness: fromRoundness,
    }

    shellStyle.position = 'absolute'
    shellStyle.top = '0px'
    shellStyle.left = '0px'
    paintShell(shellStyle, state)
    shellStyle.transition = 'none'

    if (bodyEl) {
        bodyEl.style.transformOrigin = 'center center'
        bodyEl.style.transition = 'none'
        bodyEl.style.opacity = '1'
    }

    void shellEl.offsetWidth
    shellStyle.transition = [
        `background ${config.colorDuration}s ease-in`,
        `box-shadow ${config.shadowDuration * 0.5}s ease-in`,
    ].join(', ')
    shellStyle.background = toBackground
    shellStyle.boxShadow = toShadow
    if (bodyEl) {
        bodyEl.style.transition = `opacity ${config.closeContentDuration}s ease-in`
        bodyEl.style.opacity = '0'
    }

    const pending = new Set(['x', 'y', 'width', 'height', 'roundness', 'contentScale', 'contentBlur'])

    const motion = createMotion(
        {
            ...state,
            contentScale: 1,
            contentBlur: 0,
        },
        {
            onChange(key, value) {
                if (key in state) {
                    state[key] = value
                    paintShell(shellStyle, state)
                    return
                }
                if (key === 'contentScale' && bodyEl) bodyEl.style.transform = `scale(${value})`
                if (key === 'contentBlur' && bodyEl) bodyEl.style.filter = `blur(${value}px)`
            },
            onSettle(key) {
                pending.delete(key)
                if (pending.size === 0) settle()
            },
        },
    )

    const travel = {
        stiffness: config.stiffness,
        damping: config.closeDamping,
        velocity: config.closeVelocity,
        restDelta: config.closeRestDelta,
        restSpeed: config.closeRestSpeed,
    }
    const size = sizeSpring(config, { close: true })
    motion.animate(
        {
            x: toX,
            y: toY,
            width: originRect.width,
            height: originRect.height,
            roundness: toRoundness,
            contentScale: config.contentScale,
            contentBlur: config.contentBlur,
        },
        {
            x: spring({ ...travel, direction: launchX }),
            y: spring({ ...travel, direction: launchY }),
            width: size,
            height: size,
            roundness: easing({ duration: config.radiusDuration, ease: roundnessEase(true) }),
            contentScale: easing({ duration: config.closeContentDuration, ease: Easing.easeInCubic }),
            contentBlur: easing({ duration: config.closeContentDuration, ease: Easing.easeInCubic }),
        },
    )

    let settled = false
    const safety = setTimeout(() => settle(), config.closeMaxDuration)

    function retarget(nextOrigin) {
        if (settled || !(nextOrigin instanceof HTMLElement) || !nextOrigin.isConnected) return
        const next = nextOrigin.getBoundingClientRect()
        motion.animate(
            {
                x: next.left - shellRect.left,
                y: next.top - shellRect.top,
            },
            {
                x: spring({ ...travel, velocity: 0 }),
                y: spring({ ...travel, velocity: 0 }),
            },
        )
    }

    function settle() {
        if (settled) return
        settled = true
        clearTimeout(safety)
        // Origin first, while the shell still covers it. Then the host unmounts
        // the shell and the button is already labelled and clickable.
        restoreOrigin(origin, { instant: true })
        motion.stop()
        clearFrozen(dialogEl, shellEl, bodyEl)
        onSettle?.()
    }

    return { settle, retarget }
}
