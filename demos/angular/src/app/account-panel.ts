import { Component, input } from '@angular/core'
import { modal } from 'super-beautiful-modals'

@Component({
    selector: 'app-account-panel',
    template: `
        <div class="sbm-card">
            <h2 class="sbm-title">Account</h2>
            <p class="sbm-description">
                Opening another dialog from here scales this one back.
            </p>
            <div class="sbm-actions">
                <button type="button" class="sbm-btn sbm-btn-ghost" (click)="dismiss()">Close</button>
                <button
                    type="button"
                    class="sbm-btn sbm-btn-solid sbm-btn-danger"
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
