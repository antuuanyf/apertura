---
name: super-beautiful-modals
description: Modal dialogs where the button becomes the dialog. Use when showing a modal, dialog or confirm in vanilla JS; when the morph, the reverse close, the overlay or theming misbehave; or when changing the package itself (src/core, styles.css, the demos).
---

# super-beautiful-modals

Vanilla JS dialogs with a shared-element morph out of the triggering button,
and the reverse morph back into it on close. Same motion engine as
super-beautiful-toast. No runtime dependencies. No framework adapter.

Full usage lives in `README.md`. Design decisions live in `docs/internals.md`.
Read the second one before changing anything under `src/core/`.

## Showing a dialog

```js
import { modal } from 'super-beautiful-modals'
import 'super-beautiful-modals/style.css'

const ok = await modal.open({
    origin: event.currentTarget,
    title: 'Delete this movement?',
    variant: 'danger',
})
```

The host mounts itself on the first `open()`. There is no host component to
drop in the tree. Adding a second instance uses `createModal()`. Angular
content is a component mounted in `render`; see `docs/angular.md`.

Three things bite when integrating:

- **The origin must still exist on close** for the reverse morph. If the button
  unmounts, you silently get a fade. Keep it in the DOM, even if `opacity: 0`.
- **Colours come from tokens, never from a class you add to the shell.**
  Retheme with `--sbm-*`. Restyling `.sbm-shell` directly fights the morph.
- **Do not put a CSS transform on `.sbm-dialog`.** Flex on `.sbm-item` centres
  it. `motionOf` owns that transform.

## Changing the package

```
src/core/   plain DOM and numbers. No Vue, no React.
src/index.js   createModal() / the shared `modal` instance.
```

A Vue adapter is planned, and it only stays cheap while the store stays
immutable and the host keeps the bind/enter/leave shape.

Invariants:

- **No runtime dependencies.** Springs live in `src/core/motion/`, copied from
  the toast package. Do not import from `super-beautiful-toast`.
- **Every visual value is a token with a literal fallback** on `:where(:root)`.
- **The store replaces state, never mutates it.**
- **Class names are public API.** Prefixed `sbm-`. Renaming one is breaking.
- **Read `element.js` before animating anything by hand.**

## Verifying a change

```sh
npm run build
npm run demo
```

Vanilla lives in `demos/vanilla` (`npm run demo`). Angular lives in
`demos/angular` (`npm run demo:angular`). Both resolve the library to
`../../src`.
