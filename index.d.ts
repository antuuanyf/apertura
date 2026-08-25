export type MorphPresetName = 'snappy' | 'floaty' | 'cinematic'

export interface MorphOptions {
    stiffness?: number
    damping?: number
    velocity?: number
    sizeStiffness?: number
    sizeDamping?: number
    sizeDuration?: number
    radiusDuration?: number
    contentDuration?: number
    colorDuration?: number
    colorDelay?: number
    shadowDuration?: number
    shadowDelay?: number
    contentScale?: number
    contentBlur?: number
    maxDuration?: number
    closeDamping?: number
    closeSizeDamping?: number
    closeVelocity?: number
    closeContentDuration?: number
    closeMaxDuration?: number
    closeRestDelta?: number
    closeRestSpeed?: number
}

export type MorphConfig = MorphPresetName | MorphOptions

export interface HostOptions {
    overlayDuration?: number
    enterDuration?: number
    enterDistance?: number
    enterScale?: number
    enterBlur?: number
    exitDuration?: number
    exitDistance?: number
    exitBlur?: number
    underScale?: number
    underY?: number
    underDuration?: number
    underSpring?: { stiffness?: number, damping?: number, velocity?: number }
    placementGap?: number
    placementPadding?: number
    morph?: MorphOptions
    mountTo?: string | HTMLElement
}

export interface ModalOriginStyle {
    background?: string
    boxShadow?: string
    borderRadius?: string
}

export interface ModalApiContext {
    close: (result?: unknown) => void
    id: number
}

export type ModalPlacement = 'center' | 'anchor' | 'inplace' | 'bottom'
export type ModalSize = 'sm' | 'md' | 'lg' | number | string
export type ModalVariant = 'neutral' | 'danger' | 'success' | 'warning' | (string & {})

export interface ModalOpenOptions {
    /** The element the dialog grows out of. On close it grows back in. */
    origin?: HTMLElement | null
    originStyle?: ModalOriginStyle | null
    /** Fly into this element on close instead of `origin`. */
    closeOrigin?: HTMLElement | null
    title?: string
    description?: string
    /** Defaults to "OK". Pass `null` to hide. */
    confirmLabel?: string | null
    /** Defaults to "Cancel". Pass `null` to hide. */
    cancelLabel?: string | null
    variant?: ModalVariant
    /** Escape, overlay click, and drag-to-dismiss. Default true. */
    dismissible?: boolean
    labelledBy?: string
    ariaLabel?: string
    /** Takes over the body. An element is moved in; a string is HTML. */
    content?: HTMLElement | string | null
    /** Takes over the body. Return a cleanup function if you need one. */
    render?: (body: HTMLElement, api: ModalApiContext) => void | (() => void)
    /** Named feel or a patch on top of `configure({ morph })`. */
    morph?: MorphConfig | null
    /** Max width of this dialog. */
    size?: ModalSize | null
    /** Where the slot sits. Without an origin, anchor/inplace/bottom fall back to center. */
    placement?: ModalPlacement
    /** Return `false` to keep the dialog open. May return a promise. */
    beforeClose?: (result: unknown) => unknown
    placeholder?: string
    defaultValue?: string
}

export interface ModalHandle<T = unknown> extends Promise<T> {
    id: number
}

export interface ModalApi {
    open<T = unknown>(options?: ModalOpenOptions): ModalHandle<T>
    confirm<T = boolean>(options?: ModalOpenOptions): ModalHandle<T>
    alert<T = unknown>(options?: ModalOpenOptions): ModalHandle<T>
    prompt<T = string>(options?: ModalOpenOptions): ModalHandle<T>
    /** Omit `id` to close the topmost dialog. */
    close(id?: number, result?: unknown): void
    closeAll(): void
    update(id: number, patch: Partial<ModalOpenOptions>): void
    configure(options: Partial<HostOptions>): void
    destroy(): void
    store: unknown
    host: unknown
}

export declare function createModal(options?: HostOptions): ModalApi
export declare const modal: ModalApi
export default modal

export declare const HOST_DEFAULTS: Required<Omit<HostOptions, 'mountTo' | 'morph' | 'underSpring'>> & {
    morph: Required<MorphOptions>
    underSpring: { stiffness: number, damping: number, velocity: number }
}
export declare const MORPH_DEFAULTS: Required<MorphOptions>
export declare const MORPH_PRESETS: Record<MorphPresetName, MorphOptions>

export declare function createModalStore(): unknown
export declare function createModalHost(options: { store: unknown, options?: HostOptions, mountTo?: string | HTMLElement }): unknown
export declare function createMotion(initial: Record<string, number>, opts?: object): unknown
export declare function spring(opts?: object): object
export declare function easing(opts?: object): object
export declare const Easing: Record<string, unknown>
export declare function springEase(dampingRatio: number, initialVelocity?: number): (t: number) => number
export declare function motionOf(element: HTMLElement): unknown
export declare function morphFromOrigin(params: object): { settle: () => void }
export declare function morphToOrigin(params: object): { settle: () => void, retarget: (origin: HTMLElement) => void }
