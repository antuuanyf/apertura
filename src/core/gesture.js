/**
 * Drag to dismiss. The top dialog can be pulled; past a distance or velocity
 * threshold it closes. Otherwise it springs back. Sheet placement only
 * counts a downward pull.
 */

import { motionOf } from './motion/element.js'

const IGNORE = 'input, textarea, select, button, a, [contenteditable="true"]'

export function attachDismissGesture({
    dialog,
    item,
    store,
    placement,
    origin,
    isBusy,
    onPull,
}) {
    let pointerId = null
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0
    let lastT = 0
    let vx = 0
    let vy = 0
    let dragging = false
    let pulling = false

    function towardOrigin(dx, dy) {
        if (!(origin instanceof HTMLElement) || !origin.isConnected) {
            return dy
        }
        const originRect = origin.getBoundingClientRect()
        const dialogRect = dialog.getBoundingClientRect()
        const ox = (originRect.left + originRect.width / 2) - (dialogRect.left + dialogRect.width / 2 - dx)
        const oy = (originRect.top + originRect.height / 2) - (dialogRect.top + dialogRect.height / 2 - dy)
        const length = Math.hypot(ox, oy) || 1
        return (dx * ox + dy * oy) / length
    }

    function progress(dx, dy) {
        if (placement === 'bottom') return Math.max(0, dy)
        return Math.max(Math.max(0, dy), towardOrigin(dx, dy), Math.hypot(dx, dy) * 0.45)
    }

    function onPointerDown(event) {
        if (event.button != null && event.button !== 0) return
        const current = store.get(item.id) ?? item
        if (isBusy?.() || !current.dismissible) return
        if (event.target instanceof Element && event.target.closest(IGNORE)) return
        const scroller = event.target instanceof Element
            ? event.target.closest('.apr-body, .apr-card')
            : null
        if (scroller && scroller.scrollTop > 0 && placement === 'bottom') return

        pointerId = event.pointerId
        startX = lastX = event.clientX
        startY = lastY = event.clientY
        lastT = event.timeStamp
        vx = 0
        vy = 0
        dragging = true
        pulling = false
    }

    function onPointerMove(event) {
        if (!dragging || event.pointerId !== pointerId) return
        const dt = Math.max(0.008, (event.timeStamp - lastT) / 1000)
        vx = (event.clientX - lastX) / dt
        vy = (event.clientY - lastY) / dt
        lastX = event.clientX
        lastY = event.clientY
        lastT = event.timeStamp

        const dx = event.clientX - startX
        const dy = event.clientY - startY
        if (!pulling) {
            if (Math.hypot(dx, dy) < 8) return
            pulling = true
            onPull?.(true)
            dialog.setPointerCapture?.(pointerId)
        }

        event.preventDefault()
        const x = placement === 'bottom' ? 0 : dx
        const y = placement === 'bottom' ? Math.max(0, dy) : dy
        motionOf(dialog).set({ x, y })
    }

    function onPointerUp(event) {
        if (!dragging || event.pointerId !== pointerId) return
        dragging = false
        const dx = event.clientX - startX
        const dy = event.clientY - startY
        const pulled = progress(dx, dy)
        const flung = placement === 'bottom'
            ? vy > 900
            : (Math.hypot(vx, vy) > 1100 && pulled > 24)

        if (pulling) dialog.releasePointerCapture?.(pointerId)
        pointerId = null
        onPull?.(false)

        if (pulling && (pulled > 88 || flung)) {
            pulling = false
            store.close(item.id)
            return
        }

        if (pulling) {
            motionOf(dialog).to({ x: 0, y: 0 }, {
                spring: { stiffness: 280, damping: 26, velocity: 0 },
            })
        }
        pulling = false
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointermove', onPointerMove)
    dialog.addEventListener('pointerup', onPointerUp)
    dialog.addEventListener('pointercancel', onPointerUp)

    return () => {
        dialog.removeEventListener('pointerdown', onPointerDown)
        dialog.removeEventListener('pointermove', onPointerMove)
        dialog.removeEventListener('pointerup', onPointerUp)
        dialog.removeEventListener('pointercancel', onPointerUp)
    }
}
