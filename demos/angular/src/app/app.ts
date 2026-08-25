import { Component, inject, signal } from '@angular/core'
import { AccountPanel } from './account-panel'
import { Modal } from './modal'
import { PlaylistForm } from './playlist-form'

@Component({
    selector: 'app-root',
    templateUrl: './app.html',
})
export class App {
    private readonly modal = inject(Modal)

    protected readonly dark = signal(prefersDark())
    protected readonly lastResult = signal<string | null>(null)

    constructor() {
        this.applyTheme()
    }

    protected toggleTheme() {
        this.dark.update((value) => !value)
        this.applyTheme()
    }

    protected fromButton(
        event: Event,
        title: string,
        description: string,
    ) {
        return this.modal.open({
            origin: originOf(event),
            title,
            description,
            confirmLabel: 'Got it',
            cancelLabel: null,
        })
    }

    protected fromHero(event: Event) {
        return this.modal.open({
            origin: originOf(event),
            title: 'This came out of that button',
            description: 'Close it and it will travel back in. The path is a spring, not a curve.',
            confirmLabel: 'Nice',
            cancelLabel: 'Close',
        })
    }

    protected fromTemplateRef(origin: HTMLElement) {
        return this.modal.open({
            origin,
            title: 'From a template ref',
            description: 'The opener is #opener, not the click target. Same morph.',
            confirmLabel: 'Got it',
            cancelLabel: null,
        })
    }

    protected noOrigin() {
        return this.modal.open({
            title: 'No origin',
            description: 'Nothing on screen caused this, so it fades in from the centre.',
            confirmLabel: 'OK',
            cancelLabel: null,
        })
    }

    protected async confirmDanger(event: Event) {
        const ok = await this.modal.open({
            origin: originOf(event),
            title: 'Delete this movement?',
            description: 'It can still be recovered from the archive.',
            confirmLabel: 'Delete',
            variant: 'danger',
        })
        this.report(ok)
    }

    protected async confirmNeutral(event: Event) {
        const ok = await this.modal.open({
            origin: originOf(event),
            title: 'Invite sent',
            description: 'They will see it the next time they open the app.',
            confirmLabel: 'OK',
            cancelLabel: null,
        })
        this.report(ok)
    }

    protected sticky(event: Event) {
        return this.modal.open({
            origin: originOf(event),
            title: 'Finish setting this up',
            description: 'Escape and a click outside will not close this one. You have to choose.',
            confirmLabel: 'Continue',
            cancelLabel: 'Not now',
            dismissible: false,
        })
    }

    protected noGesture(event: Event) {
        return this.modal.open({
            origin: originOf(event),
            title: 'This one does not drag',
            description: 'Escape and a click outside still close it. Pulling the card does nothing.',
            confirmLabel: 'OK',
            cancelLabel: null,
            gesture: false,
        })
    }

    protected async openPlaylist(event: Event) {
        const name = await this.modal.openComponent<PlaylistForm, string>(
            PlaylistForm,
            {
                origin: originOf(event),
                ariaLabel: 'Name the playlist',
            },
        )
        this.report(name)
    }

    protected nested(event: Event) {
        return this.modal.openComponent(AccountPanel, {
            origin: originOf(event),
            ariaLabel: 'Account',
        })
    }

    private report(value: unknown) {
        const label = value === true ? 'confirmed'
            : value === false ? 'cancelled'
            : value === undefined ? 'dismissed'
            : JSON.stringify(value)
        this.lastResult.set(`Last result: ${label}`)
    }

    private applyTheme() {
        document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light'
    }
}

function originOf(event: Event) {
    return event.currentTarget as HTMLElement
}

function prefersDark() {
    const theme = document.documentElement.dataset['theme']
    if (theme) return theme === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}
