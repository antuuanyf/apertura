import { modal } from 'apertura'
import './styles.css'

const root = document.documentElement
const themeToggle = document.querySelector('[data-theme-toggle]')
const resultEl = document.querySelector('[data-result]')

const darkPref = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches

let dark = darkPref
function applyTheme() {
    root.dataset.theme = dark ? 'dark' : 'light'
    themeToggle.textContent = dark ? 'Light' : 'Dark'
}
applyTheme()
themeToggle.addEventListener('click', () => {
    dark = !dark
    applyTheme()
})

const knobs = { stiffness: 144, damping: 14, velocity: 2400 }

function syncKnobs() {
    modal.configure({ morph: { ...knobs } })
}

for (const input of document.querySelectorAll('[data-knob]')) {
    input.addEventListener('input', () => {
        const key = input.dataset.knob
        knobs[key] = Number(input.value)
        document.querySelector(`[data-knob-value="${key}"]`).textContent = input.value
        syncKnobs()
    })
}

function report(value) {
    if (!resultEl) return
    const label = value === true ? 'confirmed'
        : value === false ? 'cancelled'
        : value === undefined ? 'dismissed'
        : JSON.stringify(value)
    resultEl.textContent = `Last result: ${label}`
}

const actions = {
    hero: (origin) => modal.open({
        origin,
        title: 'This came out of that button',
        description: 'Close it and it will travel back in. The path is a spring, not a curve.',
        confirmLabel: 'Nice',
        cancelLabel: 'Close',
    }),
    pill: (origin) => modal.open({
        origin,
        title: 'From a pill',
        description: 'Same radius, same colour, frame zero.',
        confirmLabel: 'Got it',
        cancelLabel: null,
    }),
    square: (origin) => modal.open({
        origin,
        title: 'From a square',
        description: 'The morph reads the button’s computed style.',
        confirmLabel: 'Got it',
        cancelLabel: null,
    }),
    raised: (origin) => modal.open({
        origin,
        title: 'From a raised button',
        description: 'Shadow interpolates from a transparent cast, not from none.',
        confirmLabel: 'Got it',
        cancelLabel: null,
    }),
    'no-origin': () => modal.open({
        title: 'No origin',
        description: 'Nothing on screen caused this, so it fades in from the centre.',
        confirmLabel: 'OK',
        cancelLabel: null,
    }),
    danger: async (origin) => {
        const ok = await modal.open({
            origin,
            title: 'Delete this movement?',
            description: 'It can still be recovered from the archive.',
            confirmLabel: 'Delete',
            variant: 'danger',
        })
        report(ok)
    },
    neutral: async (origin) => {
        const ok = await modal.open({
            origin,
            title: 'Invite sent',
            description: 'They will see it the next time they open the app.',
            confirmLabel: 'OK',
            cancelLabel: null,
        })
        report(ok)
    },
    sticky: (origin) => modal.open({
        origin,
        title: 'Finish setting this up',
        description: 'Escape and a click outside will not close this one. You have to choose.',
        confirmLabel: 'Continue',
        cancelLabel: 'Not now',
        dismissible: false,
    }),
    'no-gesture': (origin) => modal.open({
        origin,
        title: 'This one does not drag',
        description: 'Escape and a click outside still close it. Pulling the card does nothing.',
        confirmLabel: 'OK',
        cancelLabel: null,
        gesture: false,
    }),
    form: async (origin) => {
        const name = await modal.open({
            origin,
            ariaLabel: 'Name the playlist',
            render(body, { close }) {
                const card = document.createElement('div')
                card.className = 'apr-card'
                const title = document.createElement('h2')
                title.className = 'apr-title'
                title.textContent = 'Name the playlist'
                const input = document.createElement('input')
                input.className = 'demo-input'
                input.placeholder = 'Evening mix'
                input.autofocus = true
                const actionsRow = document.createElement('div')
                actionsRow.className = 'apr-actions'
                const cancel = document.createElement('button')
                cancel.type = 'button'
                cancel.className = 'apr-btn apr-btn-ghost'
                cancel.textContent = 'Cancel'
                cancel.addEventListener('click', () => close())
                const save = document.createElement('button')
                save.type = 'button'
                save.className = 'apr-btn apr-btn-solid'
                save.textContent = 'Save'
                save.addEventListener('click', () => close(input.value.trim() || undefined))
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') save.click()
                })
                actionsRow.append(cancel, save)
                card.append(title, input, actionsRow)
                body.append(card)
            },
        })
        report(name)
    },
    nested: (origin) => modal.open({
        origin,
        title: 'Account',
        description: 'Opening another dialog from here scales this one back.',
        confirmLabel: 'Delete account…',
        cancelLabel: 'Close',
        variant: 'danger',
        render(body, { close }) {
            const card = document.createElement('div')
            card.className = 'apr-card'
            const title = document.createElement('h2')
            title.className = 'apr-title'
            title.textContent = 'Account'
            const description = document.createElement('p')
            description.className = 'apr-description'
            description.textContent = 'Opening another dialog from here scales this one back.'
            const actionsRow = document.createElement('div')
            actionsRow.className = 'apr-actions'
            const dismiss = document.createElement('button')
            dismiss.type = 'button'
            dismiss.className = 'apr-btn apr-btn-ghost'
            dismiss.textContent = 'Close'
            dismiss.addEventListener('click', () => close())
            const next = document.createElement('button')
            next.type = 'button'
            next.className = 'apr-btn apr-btn-solid apr-btn-danger'
            next.textContent = 'Delete account…'
            next.addEventListener('click', () => {
                modal.open({
                    origin: next,
                    title: 'This cannot be undone',
                    description: 'The account and every movement in it will go.',
                    confirmLabel: 'Delete anyway',
                    variant: 'danger',
                })
            })
            actionsRow.append(dismiss, next)
            card.append(title, description, actionsRow)
            body.append(card)
        },
    }),
    prompt: async (origin) => {
        const name = await modal.prompt({
            origin,
            title: 'Name the playlist',
            placeholder: 'Evening mix',
        })
        report(name)
    },
    alert: async (origin) => {
        await modal.alert({
            origin,
            title: 'Invite sent',
            description: 'They will see it the next time they open the app.',
        })
        report(true)
    },
    success: (origin) => modal.open({
        origin,
        title: 'Saved',
        description: 'The playlist is on this device.',
        confirmLabel: 'OK',
        cancelLabel: null,
        variant: 'success',
        morph: 'snappy',
    }),
    warning: (origin) => modal.open({
        origin,
        title: 'This folder is shared',
        description: 'Anyone with the link can still open it.',
        confirmLabel: 'Got it',
        cancelLabel: null,
        variant: 'warning',
    }),
    snappy: (origin) => modal.open({
        origin,
        title: 'Snappy',
        description: 'Higher stiffness, less bounce, a shorter kick.',
        confirmLabel: 'OK',
        cancelLabel: null,
        morph: 'snappy',
        size: 'sm',
    }),
    floaty: (origin) => modal.open({
        origin,
        title: 'Floaty',
        description: 'Softer springs and a bigger launch kick.',
        confirmLabel: 'OK',
        cancelLabel: null,
        morph: 'floaty',
    }),
    wide: (origin) => modal.open({
        origin,
        title: 'A wider dialog',
        description: 'size: lg overrides the default max-width token for this call only.',
        confirmLabel: 'OK',
        cancelLabel: null,
        size: 'lg',
    }),
    menu: (origin) => modal.open({
        origin,
        placement: 'anchor',
        size: 'sm',
        morph: 'snappy',
        ariaLabel: 'Account menu',
        render(body, { close }) {
            const card = document.createElement('div')
            card.className = 'apr-card'
            const title = document.createElement('h2')
            title.className = 'apr-title'
            title.textContent = 'Account'
            const actionsRow = document.createElement('div')
            actionsRow.className = 'apr-actions'
            actionsRow.style.flexDirection = 'column'
            actionsRow.style.alignItems = 'stretch'
            for (const label of ['Profile', 'Preferences', 'Sign out']) {
                const button = document.createElement('button')
                button.type = 'button'
                button.className = label === 'Sign out' ? 'apr-btn apr-btn-solid' : 'apr-btn apr-btn-ghost'
                button.textContent = label
                button.addEventListener('click', () => close(label))
                actionsRow.append(button)
            }
            card.append(title, actionsRow)
            body.append(card)
        },
    }).then(report),
    sheet: (origin) => modal.open({
        origin,
        placement: 'bottom',
        morph: 'snappy',
        title: 'Move to',
        description: 'Drag down to dismiss. The morph still starts from the button.',
        confirmLabel: 'Archive',
        cancelLabel: 'Cancel',
    }),
    card: (origin) => {
        const name = origin.dataset.card ?? 'Folder'
        return modal.open({
            origin,
            placement: 'inplace',
            size: 'sm',
            title: name,
            description: 'This card expanded in place. Scroll the page and it follows the hole it left.',
            confirmLabel: 'Open',
            cancelLabel: 'Close',
        })
    },
    update: (origin) => {
        const handle = modal.open({
            origin,
            title: 'A short note',
            description: 'Wait a beat.',
            confirmLabel: 'OK',
            cancelLabel: null,
        })
        setTimeout(() => {
            modal.update(handle.id, {
                title: 'A longer note',
                description: 'update() replaced the copy and the shell sprang to the new height.',
            })
        }, 400)
        return handle
    },
    dirty: async (origin) => {
        let blocked = true
        const handle = modal.open({
            origin,
            title: 'Unsaved changes',
            description: 'The first dismiss is blocked by beforeClose.',
            confirmLabel: 'Discard',
            cancelLabel: 'Keep editing',
            variant: 'warning',
            beforeClose() {
                if (!blocked) return true
                blocked = false
                modal.update(handle.id, {
                    description: 'beforeClose returned false. Dismiss again to leave.',
                })
                return false
            },
        })
        report(await handle)
    },
    handoff: async (origin) => {
        const inbox = document.querySelector('[data-inbox]')
        const ok = await modal.open({
            origin,
            closeOrigin: inbox,
            title: 'Send to inbox?',
            description: 'Confirm and the dialog flies into the chip, not back into this button.',
            confirmLabel: 'Send',
            variant: 'danger',
        })
        report(ok)
    },
}

document.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', (event) => {
        const name = button.dataset.open
        actions[name]?.(event.currentTarget)
    })
})
