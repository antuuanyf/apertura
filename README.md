# apertura

Modals where the button you pressed becomes the dialog.

Press "Delete" and the button itself lifts off, travels, grows and settles into
the confirmation. Close it and the dialog travels back into the button. The
path is a spring simulation, adapted from the motion engine in
[super-beautiful-toast](https://github.com/srdavo/super-beautiful-toast).

Vanilla JS. No dependencies. No host component to mount.

**Demo:** [vanilla](https://antuuanyf.github.io/apertura/) · [Angular](https://antuuanyf.github.io/apertura/angular/)

Not on npm yet. Clone the repo and import from `src/`, or run the demos:

```sh
git clone https://github.com/antuuanyf/apertura.git
cd apertura
npm install
npm run demo            # vanilla  → http://localhost:5173
npm run demo:angular    # Angular  → http://localhost:4200
```

## Quick start

```js
import { modal } from 'apertura'
import 'apertura/style.css'

const ok = await modal.open({
    origin: event.currentTarget,
    title: 'Delete this movement?',
    description: 'It can still be recovered.',
    confirmLabel: 'Delete',
    variant: 'danger',
})

if (ok) await deleteMovement()
```

The layer is created on the first `open()` and teleports onto `document.body`.
`confirm` resolves `true`, `cancel` resolves `false`, Escape, overlay click or
a drag-to-dismiss resolves `undefined`.

Without an `origin` the dialog fades and scales in from the centre, which is
the right thing when nothing on screen caused it.

```js
const ok = await modal.confirm({
    origin: event.currentTarget,
    title: 'Delete this movement?',
    variant: 'danger',
})

const name = await modal.prompt({
    origin: event.currentTarget,
    title: 'Name the playlist',
    placeholder: 'Evening mix',
})

await modal.alert({ origin: event.currentTarget, title: 'Invite sent' })
```

## Custom content

A node, a string of HTML, or a render function. Emit a result by calling
`close`:

```js
modal.open({
    origin: event.currentTarget,
    render(body, { close }) {
        const input = document.createElement('input')
        input.placeholder = 'Name the playlist'
        const save = document.createElement('button')
        save.textContent = 'Save'
        save.onclick = () => close(input.value)
        body.append(input, save)
    },
})
```

## Options

| Option | Type | Default | |
|---|---|---|---|
| `origin` | HTMLElement | `null` | The element that becomes the dialog. |
| `closeOrigin` | HTMLElement | `origin` | Fly into this element on close. |
| `originStyle` | object | read from `origin` | `{ background, boxShadow, borderRadius }` override. |
| `title` | string | `''` | Default card heading. |
| `description` | string | `''` | Default card body. |
| `confirmLabel` | string \| null | `'OK'` | `null` hides the button. |
| `cancelLabel` | string \| null | `'Cancel'` | `null` hides the button. |
| `variant` | string | `'neutral'` | `danger`, `success` and `warning` paint the confirm button. |
| `dismissible` | boolean | `true` | Escape, overlay click, and drag-to-dismiss. |
| `gesture` | boolean | `true` | Drag-to-dismiss. Ignored when `dismissible` is false. |
| `placement` | string | `'center'` | `anchor` grows beside the origin, `inplace` expands on it, `bottom` is a sheet. |
| `size` | string \| number | token | `'sm'` `'md'` `'lg'`, a pixel number, or any CSS max-width. |
| `morph` | string \| object | configured | `'snappy'` `'floaty'` `'cinematic'`, or a patch of spring knobs. |
| `beforeClose` | function | `null` | Return `false` to keep the dialog open. May be async. |
| `content` | Element \| string | `null` | Replaces the default card. |
| `render` | function | `null` | Replaces the default card. |
| `ariaLabel` | string | from `title` | |
| `placeholder` | string | `''` | Used by `modal.prompt()`. |
| `defaultValue` | string | `''` | Used by `modal.prompt()`. |

```js
const handle = modal.open({ title: 'Hello' })
modal.update(handle.id, { description: 'A second line.' })
modal.close(handle.id, 'done')
modal.close()          // topmost
modal.closeAll()
```

## Tuning

```js
modal.configure({
    morph: { stiffness: 144, damping: 14, velocity: 2400 },
})
```

Same knobs as the toast morph. Lower `damping` bounces more. `velocity` is the
kick that bends the path. Set it to `0` and the dialog travels in a straight
line. Width and height use a separate spring (`sizeStiffness` / `sizeDamping`)
with no kick, so the box does not explode on open.

Per `open()` you can pass a named feel, or a patch that sits on top of the
configured morph:

```js
modal.open({ origin, title: 'Quick', morph: 'snappy' })
modal.open({ origin, title: 'Soft', morph: { damping: 10 } })
```

## Theming

Every value is a custom property on `:where(:root)`. Redefining one anywhere
in your own CSS wins.

```css
:root {
    --apr-bg: #202026;
    --apr-fg: #f2f2f5;
    --apr-radius: 24px;
}
```

Class names are stable, unscoped, prefixed `apr-`.

## Accessibility

A modal *is* a modal: it blocks the page, traps tab inside the dialog (via
`inert` on everything else), restores focus when it closes, and freezes scroll.
`role="dialog"` and `aria-modal="true"` are set for you. A dialog with
`dismissible: false` cannot be dismissed with Escape or a click outside, so
give it a button. `gesture: false` turns off drag-to-dismiss only.

Under `prefers-reduced-motion: reduce` there is no morph. Dialogs appear and
disappear in place.

## Isolated instances

```js
import { createModal } from 'apertura'

const settings = createModal({ mountTo: '#app' })
settings.open({ title: 'Inside the app root' })
```

## Not in this version

- No Vue or React adapter. The store is immutable so either one stays cheap.
  Angular mounts a component into `render`; see [docs/angular.md](docs/angular.md).

## License

MIT © [Antonio Monreal Diaz](https://github.com/antuuanyf)

The spring integrator in `src/core/motion/` is adapted from
[super-beautiful-toast](https://github.com/srdavo/super-beautiful-toast)
by Luis David, MIT.
