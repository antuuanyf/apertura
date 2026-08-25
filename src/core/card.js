/**
 * Default chrome: a title, a description, confirm and cancel.
 * Used when the caller did not pass `content` or `render`.
 */

import { variantButtonClass } from './presets.js'

function appendTitle(card, item) {
    if (!item.title) return
    const heading = document.createElement('h2')
    heading.className = 'apr-title'
    heading.id = `apr-title-${item.id}`
    heading.textContent = item.title
    card.append(heading)
}

function appendDescription(card, item) {
    if (!item.description) return
    const description = document.createElement('p')
    description.className = 'apr-description'
    description.textContent = item.description
    card.append(description)
}

function appendActions(card, item, { close, confirmResult }) {
    const cancelLabel = item.cancelLabel === null ? null : (item.cancelLabel ?? 'Cancel')
    const confirmLabel = item.confirmLabel === null ? null : (item.confirmLabel ?? 'OK')
    if (!cancelLabel && !confirmLabel) return

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
        button.className = 'apr-btn apr-btn-solid' + variantButtonClass(item.variant)
        button.textContent = confirmLabel
        button.addEventListener('click', () => close(confirmResult()))
        actions.append(button)
    }

    card.append(actions)
}

export function renderDefaultCard(body, item, { close }) {
    const card = document.createElement('div')
    card.className = 'apr-card'
    appendTitle(card, item)
    appendDescription(card, item)
    appendActions(card, item, { close, confirmResult: () => true })
    body.append(card)
}

export function renderPromptCard(body, item, { close }) {
    const card = document.createElement('div')
    card.className = 'apr-card'
    appendTitle(card, item)
    appendDescription(card, item)

    const input = document.createElement('input')
    input.className = 'apr-input'
    input.type = 'text'
    if (item.placeholder) input.placeholder = item.placeholder
    if (item.defaultValue != null) input.value = String(item.defaultValue)
    input.autocomplete = 'off'
    card.append(input)

    appendActions(card, item, {
        close,
        confirmResult: () => input.value,
    })

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') close(input.value)
    })

    body.append(card)
    queueMicrotask(() => input.focus())
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

    if (item.kind === 'prompt') {
        renderPromptCard(body, item, { close })
        return null
    }

    renderDefaultCard(body, item, { close })
    return null
}
