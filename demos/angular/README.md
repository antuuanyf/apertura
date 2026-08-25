# Angular demo

Runnable example of [apertura](../..) from Angular. There is no
host adapter. The normal path is `Modal.openComponent()`: a standalone
component mounted into the dialog body. See [`docs/angular.md`](../../docs/angular.md).

From the package root:

```sh
npm run demo:angular
```

Or here:

```sh
npm start
```

Then open http://localhost:4200/. The demo aliases the library to `../../src`,
same as vanilla. Styles load from `src/core/styles.css`. Usage notes live in
[`docs/angular.md`](../../docs/angular.md).
