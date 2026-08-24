import { Component, input } from '@angular/core'
import { FormsModule } from '@angular/forms'

@Component({
    selector: 'app-playlist-form',
    imports: [FormsModule],
    template: `
        <div class="sbm-card">
            <h2 class="sbm-title">Name the playlist</h2>
            <input
                class="demo-input"
                name="playlist"
                [(ngModel)]="name"
                placeholder="Evening mix"
                autofocus
                (keydown.enter)="save()"
            />
            <div class="sbm-actions">
                <button type="button" class="sbm-btn sbm-btn-ghost" (click)="cancel()">Cancel</button>
                <button type="button" class="sbm-btn sbm-btn-solid" (click)="save()">Save</button>
            </div>
        </div>
    `,
})
export class PlaylistForm {
    readonly close = input.required<(result?: string) => void>()
    name = ''

    cancel() {
        this.close()()
    }

    save() {
        this.close()(this.name.trim() || undefined)
    }
}
