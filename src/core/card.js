/**
 * Default chrome: a title, a description, confirm and cancel.
 * Used when the caller did not pass `content` or `render`.
 */

export function renderDefaultCard(body, item, { close }) {
    const card = document.createElement('div')
    card.className = 'apr-card'

    if (item.title) {
        const heading = document.createElement('h2')
        heading.className = 'apr-title'
        heading.id = `apr-title-${item.id}`
        heading.textContent = item.title
        card.append(heading)
    }

    if (item.description) {
        const description = document.createElement('p')
        description.className = 'apr-description'
        description.textContent = item.description
        card.append(description)
    }

    const cancelLabel = item.cancelLabel === null ? null : (item.cancelLabel ?? 'Cancel')
    const confirmLabel = item.confirmLabel === null ? null : (item.confirmLabel ?? 'OK')

    if (cancelLabel || confirmLabel) {
        const actions = document.createElement('div')
        actions.className = 'apr-actions'

        if (cancelLabel) {
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'apr-btn apr-btn-ghost'
            button.textContent = cancelLabel
            button.addEventListener('click', () => close(false))
            actions.append(button)
        }

        if (confirmLabel) {
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'apr-btn apr-btn-solid' + (item.variant === 'danger' ? ' apr-btn-danger' : '')
            button.textContent = confirmLabel
            button.addEventListener('click', () => close(true))
            actions.append(button)
        }

        card.append(actions)
    }

    body.append(card)
}

export function fillBody(body, item, { close, id }) {
    if (typeof item.render === 'function') {
        const cleanup = item.render(body, { close, id })
        return typeof cleanup === 'function' ? cleanup : null
    }

    if (item.content instanceof HTMLElement) {
        body.append(item.content)
        return () => item.content.remove()
    }

    if (typeof item.content === 'string') {
        body.innerHTML = item.content
        return null
    }

    renderDefaultCard(body, item, { close })
    return null
}
