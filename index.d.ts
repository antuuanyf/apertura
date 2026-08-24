export interface MorphOptions {
    stiffness?: number
    damping?: number
    velocity?: number
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
    closeVelocity?: number
    closeContentDuration?: number
    closeMaxDuration?: number
    closeRestDelta?: number
    closeRestSpeed?: number
}

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

export interface ModalOpenOptions {
    /** The element the dialog grows out of. On close it grows back in. */
    origin?: HTMLElement | null
    originStyle?: ModalOriginStyle | null
    title?: string
    description?: string
    /** Defaults to "OK". Pass `null` to hide. */
    confirmLabel?: string | null
    /** Defaults to "Cancel". Pass `null` to hide. */
    cancelLabel?: string | null
    variant?: 'neutral' | 'danger' | (string & {})
    /** Escape and overlay click. Default true. */
    dismissible?: boolean
    labelledBy?: string
    ariaLabel?: string
    /** Takes over the body. An element is moved in; a string is HTML. */
    content?: HTMLElement | string | null
    /** Takes over the body. Return a cleanup function if you need one. */
    render?: (body: HTMLElement, api: ModalApiContext) => void | (() => void)
}

export interface ModalHandle<T = unknown> extends Promise<T> {
    id: number
}

export interface ModalApi {
    open<T = unknown>(options?: ModalOpenOptions): ModalHandle<T>
    /** Omit `id` to close the topmost dialog. */
    close(id?: number, result?: unknown): void
    closeAll(): void
    configure(options: Partial<HostOptions>): void
    destroy(): void
    store: unknown
    host: unknown
}

export declare function createModal(options?: HostOptions): ModalApi
export declare const modal: ModalApi
export default modal

export declare const HOST_DEFAULTS: Required<Omit<HostOptions, 'mountTo' | 'morph'>> & { morph: Required<MorphOptions> }
export declare const MORPH_DEFAULTS: Required<MorphOptions>

export declare function createModalStore(): unknown
export declare function createModalHost(options: { store: unknown, options?: HostOptions, mountTo?: string | HTMLElement }): unknown
export declare function createMotion(initial: Record<string, number>, opts?: object): unknown
export declare function spring(opts?: object): object
export declare function easing(opts?: object): object
export declare const Easing: Record<string, unknown>
export declare function springEase(dampingRatio: number, initialVelocity?: number): (t: number) => number
export declare function motionOf(element: HTMLElement): unknown
export declare function morphFromOrigin(params: object): { settle: () => void }
export declare function morphToOrigin(params: object): { settle: () => void }
