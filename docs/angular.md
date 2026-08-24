# Angular

There is no Angular adapter. The host still mounts itself. The normal Angular
path is **a component inside the dialog**: `render` gives you a node,
`createComponent` mounts onto it, cleanup tears it down on leave.

A runnable app lives in [`demos/angular`](../demos/angular)
(`npm run demo:angular` from the repo root). Copy the `Modal` injectable from
there and call `openComponent()` from every click.

The default card (`title` / `description` / confirm) is a shortcut for a
confirm with no Angular bindings. Prefer a component whenever the body needs
signals, forms, or other components.

## Setup

```sh
npm install super-beautiful-modals
```

Import the stylesheet **globally**. The layer sits outside every component, so
`ViewEncapsulation` never reaches it.

```css
/* src/styles.css */
@import 'super-beautiful-modals/style.css';
```

Or in `angular.json` / `project.json`:

```json
"styles": [
    "node_modules/super-beautiful-modals/dist/style.css",
    "src/styles.css"
]
```

Retheme with `--sbm-*` in the same global sheet. Do not add a class to
`.sbm-shell`.

## 1. A component inside the dialog

The dialog body is a regular standalone component. It receives `close` as an
input and calls it with the result. Use the public `sbm-*` classes so it
matches the default card.

```ts
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
```

`close()` resolves the `open()` promise. `close(false)` is cancel,
`close(undefined)` is dismiss, any other value is your result.

Hide the default chrome (`confirmLabel` / `cancelLabel` `null`) so only the
component paints. `render` must return a cleanup; the host calls it on leave.
Do not leave the `ComponentRef` attached.

```ts
import {
    ApplicationRef,
    Component,
    EnvironmentInjector,
    createComponent,
    inject,
} from '@angular/core'
import { modal } from 'super-beautiful-modals'
import { PlaylistForm } from './playlist-form'

@Component({ /* ... */ })
export class LibraryComponent {
    private readonly appRef = inject(ApplicationRef)
    private readonly injector = inject(EnvironmentInjector)

    openPlaylist(event: Event) {
        return modal.open<string>({
            origin: event.currentTarget as HTMLElement,
            ariaLabel: 'Name the playlist',
            confirmLabel: null,
            cancelLabel: null,
            render: (body, { close }) => {
                const ref = createComponent(PlaylistForm, {
                    environmentInjector: this.injector,
                    hostElement: body,
                })
                this.appRef.attachView(ref.hostView)
                ref.setInput('close', close)
                ref.changeDetectorRef.detectChanges()
                return () => {
                    this.appRef.detachView(ref.hostView)
                    ref.destroy()
                }
            },
        })
    }
}
```

Pass extra inputs with `ref.setInput(...)` before `detectChanges()`. The
component host is `body`; do not wrap it in another root.

## 2. Put the bridge on an injectable

Do not copy that `render` block into every click. One `Modal` in the app is
enough. This is still not a host adapter: it is the same `modal.open()`, plus
mount/unmount.

```ts
import {
    ApplicationRef,
    EnvironmentInjector,
    Injectable,
    Type,
    createComponent,
    inject,
} from '@angular/core'
import { modal, type ModalOpenOptions } from 'super-beautiful-modals'

@Injectable({ providedIn: 'root' })
export class Modal {
    private readonly appRef = inject(ApplicationRef)
    private readonly injector = inject(EnvironmentInjector)

    open<T = unknown>(options: ModalOpenOptions = {}) {
        return modal.open<T>(options)
    }

    openComponent<T, R = unknown>(
        component: Type<T>,
        options: ModalOpenOptions = {},
    ) {
        return this.open<R>({
            ...options,
            confirmLabel: null,
            cancelLabel: null,
            render: (body, { close }) => {
                const ref = createComponent(component, {
                    environmentInjector: this.injector,
                    hostElement: body,
                })
                this.appRef.attachView(ref.hostView)
                ref.setInput('close', close)
                ref.changeDetectorRef.detectChanges()
                return () => {
                    this.appRef.detachView(ref.hostView)
                    ref.destroy()
                }
            },
        })
    }
}
```

Then every dialog is a component and a click:

```ts
const name = await this.modal.openComponent<PlaylistForm, string>(
    PlaylistForm,
    { origin: event.currentTarget as HTMLElement, ariaLabel: 'Name the playlist' },
)
```

The component must declare `close` as an input. After `await`, write a signal
(zoneless) or run inside `NgZone.run()` (Zone.js). Opening the spring outside
the zone is optional: wrap `modal.open()` in `NgZone.runOutsideAngular()` if
Zone.js is scheduling change detection every frame.

The demo uses this injectable. Copy it from
[`demos/angular/src/app/modal.ts`](../demos/angular/src/app/modal.ts).

## 3. Default card from a click

A confirm with no Angular in the body. No `openComponent`, no `render`.

```ts
const ok = await this.modal.open({
    origin: event.currentTarget as HTMLElement,
    title: 'Delete this movement?',
    description: 'It can still be recovered.',
    confirmLabel: 'Delete',
    variant: 'danger',
})
if (ok) await this.deleteMovement()
```

`confirm` resolves `true`, `cancel` resolves `false`, Escape or overlay click
resolves `undefined`. Pass `event.currentTarget`, not `event.target`: a click
on an icon inside the button would otherwise morph the icon.

Without an `origin` the dialog fades in from the centre.

## 4. Origin from a template ref

Same call, when the opener is not the click target.

```html
<button type="button" #opener (click)="onOpen(opener)">Open</button>
```

```ts
onOpen(origin: HTMLElement) {
    return this.modal.openComponent(PlaylistForm, { origin })
}
```

`ElementRef.nativeElement` is the same thing. The value must be an
`HTMLElement` that is still connected when the dialog closes.

## 5. Nested

A dialog can open another. The one underneath scales back and goes inert.
Pass the inner button as `origin` so the second morphs out of it.

```ts
// inside AccountPanel, which is already mounted in a dialog
onDelete(event: Event) {
    modal.open({
        origin: event.currentTarget as HTMLElement,
        title: 'This cannot be undone',
        confirmLabel: 'Delete anyway',
        variant: 'danger',
    })
}
```

## Isolated instances

```ts
import { createModal } from 'super-beautiful-modals'

const settings = createModal({ mountTo: '#app' })
settings.open({ title: 'Inside the app root' })
```

The shared `modal` is one host. A second `createModal()` is a second layer.

## Things Angular will break

**The origin must still exist on close.** `@if` / `*ngIf`, a route change, or
destroying the row that held the button silently falls back to a fade. Keep
the element in the DOM, even at `opacity: 0`.

**Colours come from tokens.** `--sbm-*` in global CSS. A class on `.sbm-shell`
fights the morph.

**SSR has no `document`.** Call `open()` from a click, `afterNextRender`, or
behind `isPlatformBrowser`. The host already no-ops `ensureMounted()` when
`document` is missing, but there is nothing to morph from on the server.

**Do not put a CSS transform on `.sbm-dialog`.** Flex on `.sbm-item` centres
it. `motionOf` owns that transform.
