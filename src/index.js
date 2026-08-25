/**
 * apertura. Vanilla entry point.
 *
 *   import { modal } from 'apertura'
 *   import 'apertura/style.css'
 *
 *   const ok = await modal.open({
 *       origin: event.currentTarget,
 *       title: 'Delete this movement?',
 *       description: 'It can still be recovered.',
 *       variant: 'danger',
 *   })
 *
 * No host to mount. The layer is created on the first open() and lives on
 * document.body until you call destroy().
 */

import { createModalStore } from './core/store.js'
import { createModalHost } from './core/host.js'
import './core/styles.css'

export {
    createModalStore,
    createModalHost,
    HOST_DEFAULTS,
    MORPH_DEFAULTS,
    MORPH_PRESETS,
    createMotion,
    spring,
    easing,
    Easing,
    springEase,
    motionOf,
    morphFromOrigin,
    morphToOrigin,
} from './core/index.js'

export function createModal(options = {}) {
    const store = createModalStore()
    const host = createModalHost({ store, options, mountTo: options.mountTo ?? 'body' })
    const pending = new Map()

    host.onRemoved = (id, result) => {
        pending.get(id)?.(result)
        pending.delete(id)
    }

    function open(opts = {}) {
        host.mount()
        const id = store.open(opts)
        let resolve
        const promise = new Promise((r) => { resolve = r })
        pending.set(id, resolve)
        promise.id = id
        return promise
    }

    function close(id, result) {
        if (id == null) store.closeTop(result)
        else store.close(id, result)
    }

    function confirm(opts = {}) {
        return open({
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            ...opts,
        })
    }

    function alert(opts = {}) {
        return open({
            confirmLabel: 'OK',
            ...opts,
            cancelLabel: null,
        })
    }

    function prompt(opts = {}) {
        return open({
            confirmLabel: 'OK',
            cancelLabel: 'Cancel',
            ...opts,
            kind: 'prompt',
            render: undefined,
            content: null,
        })
    }

    return {
        open,
        confirm,
        alert,
        prompt,
        close,
        closeAll: () => store.closeAll(),
        update: (id, patch) => store.update(id, patch),
        configure: (patch) => host.configure(patch),
        destroy: () => {
            for (const resolve of pending.values()) resolve(undefined)
            pending.clear()
            host.destroy()
        },
        store,
        host,
    }
}

export const modal = createModal()
export default modal
