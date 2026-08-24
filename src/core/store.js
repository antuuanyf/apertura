/**
 * The store: which dialogs exist right now. No DOM.
 *
 * State is treated as immutable. Every change replaces the array AND the item
 * that changed, so a future Vue or React adapter can sit on top of this the
 * same way they sit on the toast queue.
 */

export function createModalStore() {
    const listeners = new Set()
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
            title: options.title ?? '',
            description: options.description ?? '',
            confirmLabel: options.confirmLabel,
            cancelLabel: options.cancelLabel,
            variant: options.variant ?? 'neutral',
            dismissible: options.dismissible !== false,
            content: options.content ?? null,
            render: options.render ?? null,
            ariaLabel: options.ariaLabel ?? null,
            labelledBy: options.labelledBy ?? null,
            closing: false,
            result: undefined,
        }]
        emit()
        return id
    }

    function close(id, result) {
        const item = items.find((entry) => entry.id === id && !entry.closing)
        if (!item) return
        replace(id, { closing: true, result })
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

    function remove(id) {
        const item = items.find((entry) => entry.id === id)
        const next = items.filter((entry) => entry.id !== id)
        if (next.length === items.length) return undefined
        items = next
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
        remove,
        get,
        subscribe,
        getItems: () => items,
    }
}
