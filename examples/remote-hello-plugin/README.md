# remote-hello-plugin

The reference remote plugin for flamapy-ide's experimental remote loading: a single
plain-ESM file (`hello-plugin.js`) that contributes a view and a status-bar item.

## The remote plugin contract

- **Default-export** a `{ manifest, activate }` object (the same `FlamapyPlugin` shape a
  workspace plugin has; see `@flamapy/plugin-api`).
- **Never bundle React.** Import `react`, `react-dom`, `react/jsx-runtime` and
  `@flamapy/plugin-api` as bare specifiers — the IDE's import map resolves them to the
  shell's instances. When building with a bundler (vite lib mode, rollup, esbuild),
  declare those four as externals.
- **Serve with CORS headers.** The IDE runs cross-origin isolated
  (`Cross-Origin-Embedder-Policy: credentialless`), so the plugin host must allow
  cross-origin fetching.

## Try it

```bash
npx serve --cors examples/remote-hello-plugin   # serves on http://localhost:3000
```

In the IDE: activity bar → cloud icon (*Remote plugins — experimental*) → enable the
flag → load `http://localhost:3000/hello-plugin.js`. A "Hello" tab and a 👋 status-bar
item appear; the URL is remembered and reloaded on the next startup while the flag stays
enabled.
