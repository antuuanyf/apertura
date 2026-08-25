import { Component, input } from '@angular/core'
import { FormsModule } from '@angular/forms'

@Component({
    selector: 'app-playlist-form',
    imports: [FormsModule],
    template: `
        <div class="apr-card">
            <h2 class="apr-title">Name the playlist</h2>
            <input
                class="demo-input"
                name="playlist"
                [(ngModel)]="name"
                placeholder="Evening mix"
                autofocus
                (keydown.enter)="save()"
            />
            <div class="apr-actions">
                <button type="button" class="apr-btn apr-btn-ghost" (click)="cancel()">Cancel</button>
                <button type="button" class="apr-btn apr-btn-solid" (click)="save()">Save</button>
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
