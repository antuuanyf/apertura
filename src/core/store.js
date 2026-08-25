/**
 * The store: which dialogs exist right now. No DOM.
 *
 * State is treated as immutable. Every change replaces the array AND the item
 * that changed, so a future Vue or React adapter can sit on top of this the
 * same way they sit on the toast queue.
 */

export function createModalStore() {
    const listeners = new Set()
    const pendingClose = new Set()
    let items = []
    let nextId = 0

    function emit() {
        for (const listener of [...listeners]) listener(items)
    }

    function replace(id, patch) {
        let changed = false
        items = items.map((item) => {
            if (item.id !== id) return item
            changed = true
            return { ...item, ...patch }
        })
        if (changed) emit()
    }

    function open(options = {}) {
        const id = ++nextId
        items = [...items, {
            id,
            origin: options.origin instanceof Element ? options.origin : null,
            originStyle: options.originStyle ?? null,
            closeOrigin: options.closeOrigin instanceof Element ? options.closeOrigin : null,
            title: options.title ?? '',
            description: options.description ?? '',
            confirmLabel: options.confirmLabel,
            cancelLabel: options.cancelLabel,
            variant: options.variant ?? 'neutral',
            dismissible: options.dismissible !== false,
            gesture: options.gesture !== false,
            content: options.content ?? null,
            render: options.render ?? null,
            ariaLabel: options.ariaLabel ?? null,
            labelledBy: options.labelledBy ?? null,
            morph: options.morph ?? null,
            size: options.size ?? null,
            placement: options.placement ?? 'center',
            beforeClose: typeof options.beforeClose === 'function' ? options.beforeClose : null,
            kind: options.kind ?? null,
            placeholder: options.placeholder ?? '',
            defaultValue: options.defaultValue ?? '',
            closing: false,
            result: undefined,
            rev: 0,
        }]
        emit()
        return id
    }

    function close(id, result) {
        const item = items.find((entry) => entry.id === id && !entry.closing)
        if (!item || pendingClose.has(id)) return

        const finish = (allow) => {
            pendingClose.delete(id)
            const current = items.find((entry) => entry.id === id && !entry.closing)
            if (!current) return
            if (allow === false) return
            replace(id, { closing: true, result })
        }

        if (typeof item.beforeClose !== 'function') {
            finish(true)
            return
        }

        pendingClose.add(id)
        Promise.resolve(item.beforeClose(result)).then(finish, () => {
            pendingClose.delete(id)
        })
    }

    function closeTop(result) {
        for (let i = items.length - 1; i >= 0; i -= 1) {
            if (!items[i].closing) {
                close(items[i].id, result)
                return items[i].id
            }
        }
        return null
    }

    function closeAll() {
        const live = items.filter((item) => !item.closing)
        if (!live.length) return
        items = items.map((item) => (item.closing ? item : { ...item, closing: true, result: undefined }))
        emit()
    }

    function update(id, patch = {}) {
        const item = items.find((entry) => entry.id === id && !entry.closing)
        if (!item) return
        const next = { ...patch }
        if (next.origin != null && !(next.origin instanceof Element)) next.origin = item.origin
        if (next.closeOrigin != null && !(next.closeOrigin instanceof Element)) {
            next.closeOrigin = item.closeOrigin
        }
        replace(id, { ...next, rev: item.rev + 1 })
    }

    function remove(id) {
        const item = items.find((entry) => entry.id === id)
        const next = items.filter((entry) => entry.id !== id)
        if (next.length === items.length) return undefined
        items = next
        pendingClose.delete(id)
        emit()
        return item?.result
    }

    function get(id) {
        return items.find((item) => item.id === id) ?? null
    }

    function subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
    }

    return {
        open,
        close,
        closeTop,
        closeAll,
        update,
        remove,
        get,
        subscribe,
        getItems: () => items,
    }
}
