# Changelog

## Unreleased

Renamed the package from `super-beautiful-modals` to `apertura`. Public
classes are prefixed `apr-`; tokens are `--apr-*`.

## 0.1.0

First release. Dialogs that fly out of a button and back into it, using the
spring engine from super-beautiful-toast.

Vanilla JS. No framework adapter, no runtime dependencies.

- Open morph from `origin`, reverse morph on close.
- Fade + scale when there is no origin, or under `prefers-reduced-motion`.
- Overlay fades independently; `backdrop-filter` works because the scrim is
  not under a transformed ancestor.
- Default card (title, description, confirm/cancel) plus `content` / `render`.
- `inert` on the rest of the page, scroll lock, focus restore, Escape.
- Nested dialogs: the one underneath scales back and goes inert.
- Tokens on `:where(:root)`, classes prefixed `apr-`.
