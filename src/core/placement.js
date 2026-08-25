/**
 * Where the dialog slot sits before the morph measures it.
 *
 * The morph flies originRect → freezeSlot(dialog). Changing destination is
 * a layout problem: top/left on .apr-dialog, never a CSS transform.
 */

export const PLACEMENTS = new Set(['center', 'anchor', 'inplace', 'bottom'])

export function resolvePlacement(value, origin) {
    const placement = PLACEMENTS.has(value) ? value : 'center'
    if ((placement === 'anchor' || placement === 'inplace' || placement === 'bottom')
        && !(origin instanceof HTMLElement && origin.isConnected)) {
        return 'center'
    }
    return placement
}

function clamp(value, min, max) {
    if (max < min) return min
    return Math.min(max, Math.max(min, value))
}

export function layoutSlot(dialog, itemEl, origin, placement, {
    gap = 8,
    padding = 16,
} = {}) {
    itemEl.classList.toggle('apr-item-placed', placement !== 'center')
    itemEl.classList.toggle('apr-item-inplace', placement === 'inplace')
    itemEl.classList.toggle('apr-item-sheet', placement === 'bottom')
    dialog.classList.toggle('apr-sheet', placement === 'bottom')
    dialog.dataset.aprPlacement = placement

    if (placement === 'center') {
        dialog.style.position = ''
        dialog.style.top = ''
        dialog.style.left = ''
        return
    }

    dialog.style.position = 'absolute'
    dialog.style.top = '0px'
    dialog.style.left = '0px'

    const originRect = origin.getBoundingClientRect()
    const rect = dialog.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const padLeft = padding
    const padRight = padding
    const padTop = padding
    const padBottom = padding

    let left
    let top

    if (placement === 'inplace') {
        left = originRect.left + originRect.width / 2 - width / 2
        top = originRect.top + originRect.height / 2 - height / 2
    } else if (placement === 'bottom') {
        left = window.innerWidth / 2 - width / 2
        top = window.innerHeight - height - padBottom
    } else {
        left = originRect.left
        top = originRect.bottom + gap
        if (top + height > window.innerHeight - padBottom) {
            top = originRect.top - height - gap
        }
        if (left + width > window.innerWidth - padRight) {
            left = originRect.right - width
        }
    }

    left = clamp(left, padLeft, window.innerWidth - width - padRight)
    top = clamp(top, padTop, window.innerHeight - height - padBottom)

    dialog.style.left = `${left}px`
    dialog.style.top = `${top}px`
}

export function trackOrigin(origin, onMove) {
    if (!(origin instanceof HTMLElement)) return () => {}

    let frame = 0
    let last = ''

    const tick = () => {
        frame = requestAnimationFrame(tick)
        if (!origin.isConnected) return
        const rect = origin.getBoundingClientRect()
        const key = `${rect.left.toFixed(1)}|${rect.top.toFixed(1)}|${rect.width.toFixed(1)}|${rect.height.toFixed(1)}`
        if (key === last) return
        last = key
        onMove(rect)
    }

    const nudge = () => {
        last = ''
    }

    frame = requestAnimationFrame(tick)
    window.addEventListener('scroll', nudge, true)
    window.addEventListener('resize', nudge)

    return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('scroll', nudge, true)
        window.removeEventListener('resize', nudge)
    }
}
