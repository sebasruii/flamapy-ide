# Authoring flamapy-ide plugins

Since v3 the IDE is a plugin workbench: the shell owns the editor, the tabs, the layout
chrome, the UVL **document** and the plugin host — everything else (the flamapy analysis
engine, every visualization, the configurator, the featuredraw diagram) is a plugin.

## The contract

A plugin is an object with an identity-only manifest and an imperative `activate`:

```ts
import type { FlamapyPlugin } from "@flamapy/plugin-api";

export const myPlugin: FlamapyPlugin = {
  manifest: {
    id: "acme.my-plugin",          // globally unique, stable
    name: "My Plugin",
    version: "1.0.0",
    dependencies: ["flamapy.engine"], // activated before you (optional)
  },
  activate(ctx) {
    // Register contributions; push what they return into ctx.subscriptions
    // and it is disposed automatically (in reverse order) on deactivation.
  },
};
```

There are no declarative contribution points: everything is registered inside
`activate(ctx)` and returns a `Disposable`. Registering and disposing dynamically is
first-class — the charts plugin registers its BDD-gated views only while a bdd backend
is installed, reacting to the runtime catalog.

## What `ctx` gives you

- **`ctx.shell.documents`** — the UVL document (single source of truth for the model
  text): `getText()`, `setText(text, origin)`, `onDidChange`. Tag your writes with your
  own `origin` string and ignore your echo in `onDidChange`.
- **`ctx.shell.views`** — main-panel views: `register({ id, title, component, dynamic?,
  keepMounted?, order?, onBeforeOpen? })`, `open(id)` (runs the `onBeforeOpen` gate),
  `close(id)`, `onDidChangeActive`. Views render inside an error boundary — a crash
  shows a fallback, never takes down the shell.
- **`ctx.shell.sidebar` / `toolbar` / `statusBar`** — panels for either side, dropdown
  menu groups, status items.
- **`ctx.shell.commands`** — the cross-plugin command bus: `register(id, handler)`,
  `execute(id, args)`. Example: the engine's optimization action executes
  `flamapy.charts.showParetoFront`.
- **`ctx.shell.output` / `problems` / `modals` / `fileHandlers`** — the bottom output
  panel, diagnostics markers per source, the modal stack, and importers for foreign
  file extensions.
- **`ctx.services`** — the typed service registry. The engine plugin provides
  `flamapy.engine.worker` (Pyodide calls, interrupt/restart, runtime Python-wheel
  installs), `flamapy.engine.catalog` (the capability catalog), `flamapy.engine.analysis`
  (validation keyed to document versions, operation dispatch WASM/REST) and
  `flamapy.engine.configurator`. Import the ids and types from
  `@flamapy/plugin-flamapy-engine`.
- **`ctx.settings`** — localStorage-backed key/value settings namespaced by plugin id.

## Ways to ship a plugin

1. **Workspace package (built-in)** — a `packages/plugin-*` npm workspace registered in
   `src/workbench/builtinPlugins.ts`. All first-party plugins work this way; read
   `packages/plugin-view-graph` as the minimal example.
2. **Separate repository** — like featuredraw: the repo builds a library whose entry
   exports the plugin object; the IDE consumes it as a dependency. Types can be declared
   structurally (see featuredraw's `src/plugin/api.ts`) so no build-time dependency on
   the IDE is needed.
3. **Remote ESM bundle (experimental)** — a single ESM file that *default-exports* the
   plugin. Build with `react`, `react-dom`, `react/jsx-runtime` and
   `@flamapy/plugin-api` as externals: the IDE's import map resolves them to the shell's
   instances (a second React copy breaks hooks). Serve with CORS headers (the page runs
   with `COEP: credentialless`). Users enable `experimental.remotePlugins` (cloud icon in
   the activity bar) and load your URL; it is remembered across sessions.
   `examples/remote-hello-plugin/` is the no-build-step reference, and featuredraw's
   `npm run build` shows the bundled variant.

## Rules of thumb

- The **document is the source of truth** for the model. Never keep a divergent copy;
  hydrate from it and commit edits back with your origin tag (featuredraw's
  `documentSync.ts` is the reference implementation of a two-way sync).
- Gate expensive/validity-dependent views with `onBeforeOpen` and the engine's
  `ensureValidated()` (or reuse `validModelGate` from the engine package).
- Don't import the `@flamapy/web-ui` barrel from a plugin — import component files
  directly (the barrel drags monaco in).
- Everything you register must land in `ctx.subscriptions` unless you dispose it
  yourself.
