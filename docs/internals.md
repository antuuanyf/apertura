# Internals

Notes for whoever iterates on this next. The README says how to use the
package. This says why it is built the way it is.

## The split

Vanilla on purpose. There is no framework adapter yet. The host builds the
DOM itself, which is what a Vue or React adapter would otherwise do: create
the tree, then hand elements to the morph. Angular can call `open()` as-is;
see [angular.md](angular.md).

```
src/core/
  store.js         what dialogs exist. Immutable state, observable.
  morph.js         button → dialog and dialog → button.
  lock.js          inert, scroll lock, restore focus.
  card.js          default chrome (title, copy, actions, prompt).
  host.js          DOM, overlay, enter, leave, nested stack.
  placement.js     slot layout for center / anchor / inplace / bottom.
  gesture.js       drag-to-dismiss.
  presets.js       snappy / floaty / cinematic, size, variant classes.
  env.js           isBrowser, prefersReducedMotion.
  styles.css       prefixed apr-, tokens on :where(:root).
  motion/          copied from super-beautiful-toast.
                   engine, easing, element. Do not import from the toast package.
src/index.js       createModal() / the shared `modal` instance.
```

`motion/` is a copy, not a workspace dependency. Two rAF loops on a page that
also uses the toast package are fine. Two `motionOf` WeakMaps on the *same
node* are not, and should not happen: toasts own `.sbt-*`, this owns `.apr-*`.

## Anatomy of one dialog

```
.apr-layer                 fixed, inset 0, pointer-events none
  .apr-item                absolute, inset 0, flex-centered   × N
    .apr-overlay           the scrim. This is what can blur: it has no
                           transformed ancestor. The toast package could not.
    .apr-dialog            the slot. Its transform belongs to enter/leave/under.
      .apr-shell           the skin. This is what morphs.
        .apr-body          padding, and the content
```

The item is flex-centered so the slot has **no CSS transform**. `motionOf`
writes the transform string from memory; a `translate(-50%, -50%)` here would
be overwritten, the same bug the toast stacks had to dodge.

The shell and the dialog both carry transforms, on purpose. Leave/under own
the dialog; the morph owns the shell. They never touch each other's.

## Open vs close

Toasts restore the origin when the morph *lands*. A dialog is the opposite:
the origin stays hidden for the whole life of the modal, and only comes back
when the reverse morph covers it (or when a fade-out has started, if there is
no origin left to fly into).

If the origin has been unmounted, disconnected, or has a zero rect (display
none, off-screen collapsed), close falls back to a fade. Same if the user
asked for reduced motion.

Close is slightly more damped (`closeDamping: 20`, `closeSizeDamping: 26`) so
the shell settles into the button instead of overshooting it. Position still
gets the launch kick; size springs do not (a kick on width explodes the box).
Roundness stays a short tween so a pill does not oscillate. Content unblurs
and fades in during the flight (~150ms delay, then 320ms). On close, content
hides in ~160ms so a form is not seen squashing.

`placement` is layout, not a second morph. The slot is positioned with
`top`/`left` on `.apr-dialog` (or flex-centered for `center`) *before*
`freezeSlot` measures. Anchor, inplace and bottom track the origin while
open, and retarget x/y during the reverse morph if it moves. Never put a
CSS transform on `.apr-dialog` to place it.

## Overlay

Fade only. It does not morph. `backdrop-filter` works here because the overlay
is a sibling of the dialog, not a child of a transformed toast.

## Nested dialogs

A new item is a new full-screen stack. The one underneath scales to
`underScale` (0.96) and drops `underY` pixels, and goes `inert`. Only the top
dialog is in the tab order. Closing the top one puts the one below back.

## Gotchas already paid for

1. **Freeze the dialog slot before the shell goes `absolute`.** Otherwise the
   shell leaving flow collapses the flex item to 0×0 and the morph measures
   nonsense.
2. **Freeze the body's width** before the shell shrinks to the button, or the
   content rewraps mid-flight. Same as toasts, stricter because the content is
   a form, not a line of text.
3. **A shadow will not interpolate from `none`.** The reverse morph starts from
   a transparent cast of the dialog's own shadow, same as the open path.
4. **`transition: transform` on the shell fights the morph.** The morph sets
   `transition: none` at frame zero, then colour and shadow only.
5. **Never read the current transform back from the DOM.** `element.js` keeps
   every channel in memory.
6. **Do not put a CSS transform on `.apr-dialog` for centring.** Flex on the
   item. See anatomy.
7. **Acquire the page lock after the layer is in the tree,** or the lock will
   try to inert a layer that is not there yet, and miss a sibling that is.

8. **A tween whose target equals its current value must still settle.** After
   `kill()`, channels are inactive. `to({ scale: 0.94 })` when scale is already
   0.94 (dismiss mid-enter, or a restack that never moved) used to skip
   `onSettle`, so the completion group never hit zero and `leave()` never
   unmounted. Overlay at 0, dialog at 0, node still in the tree. The engine
   now fires `onSettle` on that path; leave also has a short safety net.

9. **Pixel radius is a lie for pills.** `border-radius: 999px` on a 40px-tall
   button is a capsule. Tweening 999 → 32 looks like a pill until the number
   drops below half the short side, which is the last frames, then a snap.
   Morph a *ratio* of `min(width, height)` instead, in lockstep with size.

10. **Restore the origin instantly, under the arriving shell.** Waiting for
    `maxDuration` (1100ms) then fading opacity over 300ms left the button
    unlabelled and unclickable after the dialog had already visually gone.
    Close settles when the springs rest (with pixel-scale restDelta), restores
    `opacity`/`pointer-events` with no transition, then unmounts.

## Lifecycle

Every morph registers an idempotent `settle()`. Leave calls it first, so a
dialog dismissed mid-flight is not left frozen. `destroy()` settles everything,
restores every hidden origin, and releases the page lock.

## Reduced motion

`element.to()` lands instantly. `host.enter()` skips the morph. Overlay fade
duration goes to 0. CSS turns off the overlay blur.
