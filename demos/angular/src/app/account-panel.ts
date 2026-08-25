import { Component, input } from '@angular/core'
import { modal } from 'apertura'

@Component({
    selector: 'app-account-panel',
    template: `
        <div class="apr-card">
            <h2 class="apr-title">Account</h2>
            <p class="apr-description">
                Opening another dialog from here scales this one back.
            </p>
            <div class="apr-actions">
                <button type="button" class="apr-btn apr-btn-ghost" (click)="dismiss()">Close</button>
                <button
                    type="button"
                    class="apr-btn apr-btn-solid apr-btn-danger"
                    (click)="onDelete($event)"
                >
                    Delete account…
                </button>
            </div>
        </div>
    `,
})
export class AccountPanel {
    readonly close = input.required<(result?: unknown) => void>()

    dismiss() {
        this.close()()
    }

    onDelete(event: Event) {
        modal.open({
            origin: event.currentTarget as HTMLElement,
            title: 'This cannot be undone',
            description: 'The account and every movement in it will go.',
            confirmLabel: 'Delete anyway',
            variant: 'danger',
        })
    }
}
