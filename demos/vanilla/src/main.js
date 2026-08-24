import { modal } from 'super-beautiful-modals'
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
    form: async (origin) => {
        const name = await modal.open({
            origin,
            ariaLabel: 'Name the playlist',
            render(body, { close }) {
                const card = document.createElement('div')
                card.className = 'sbm-card'
                const title = document.createElement('h2')
                title.className = 'sbm-title'
                title.textContent = 'Name the playlist'
                const input = document.createElement('input')
                input.className = 'demo-input'
                input.placeholder = 'Evening mix'
                input.autofocus = true
                const actionsRow = document.createElement('div')
                actionsRow.className = 'sbm-actions'
                const cancel = document.createElement('button')
                cancel.type = 'button'
                cancel.className = 'sbm-btn sbm-btn-ghost'
                cancel.textContent = 'Cancel'
                cancel.addEventListener('click', () => close())
                const save = document.createElement('button')
                save.type = 'button'
                save.className = 'sbm-btn sbm-btn-solid'
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
            card.className = 'sbm-card'
            const title = document.createElement('h2')
            title.className = 'sbm-title'
            title.textContent = 'Account'
            const description = document.createElement('p')
            description.className = 'sbm-description'
            description.textContent = 'Opening another dialog from here scales this one back.'
            const actionsRow = document.createElement('div')
            actionsRow.className = 'sbm-actions'
            const dismiss = document.createElement('button')
            dismiss.type = 'button'
            dismiss.className = 'sbm-btn sbm-btn-ghost'
            dismiss.textContent = 'Close'
            dismiss.addEventListener('click', () => close())
            const next = document.createElement('button')
            next.type = 'button'
            next.className = 'sbm-btn sbm-btn-solid sbm-btn-danger'
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
}

document.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', (event) => {
        const name = button.dataset.open
        actions[name]?.(event.currentTarget)
    })
})
