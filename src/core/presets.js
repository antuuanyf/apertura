/**
 * Named morph feels. A string on open() is a patch on top of the live
 * configure() morph, not a full replacement of every duration.
 */

export const MORPH_PRESETS = {
    snappy: {
        stiffness: 260,
        damping: 22,
        velocity: 1600,
        sizeStiffness: 240,
        sizeDamping: 28,
        closeDamping: 26,
        closeSizeDamping: 32,
    },
    floaty: {
        stiffness: 88,
        damping: 11,
        velocity: 2800,
        sizeStiffness: 110,
        sizeDamping: 16,
        closeDamping: 16,
        closeSizeDamping: 20,
    },
    cinematic: {
        stiffness: 64,
        damping: 13,
        velocity: 3200,
        sizeStiffness: 90,
        sizeDamping: 18,
        colorDuration: 0.55,
        shadowDuration: 0.8,
        closeDamping: 18,
        closeSizeDamping: 22,
    },
}

export function resolveMorph(override, base) {
    if (override == null || override === '') return { ...base }
    if (typeof override === 'string') {
        return { ...base, ...(MORPH_PRESETS[override] ?? {}) }
    }
    return { ...base, ...override }
}

export const SIZE_WIDTHS = {
    sm: 'min(320px, calc(100vw - 32px))',
    md: 'min(440px, calc(100vw - 32px))',
    lg: 'min(640px, calc(100vw - 32px))',
}

export function applySize(element, size) {
    if (!element || size == null) return
    const value = SIZE_WIDTHS[size]
        ?? (typeof size === 'number' ? `${size}px` : String(size))
    element.style.setProperty('--apr-max-width', value)
}

export function variantButtonClass(variant) {
    if (variant === 'danger') return ' apr-btn-danger'
    if (variant === 'success') return ' apr-btn-success'
    if (variant === 'warning') return ' apr-btn-warning'
    return ''
}
