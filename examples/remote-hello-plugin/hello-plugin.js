// A minimal remote flamapy-ide plugin, written as plain ESM so it can be served from any
// static file server with no build step. The bare imports below resolve through the
// IDE's import map to the shell's own module instances — a remote plugin must never
// bundle its own React copy (hooks would break). Bundled plugins achieve the same by
// declaring react, react-dom, react/jsx-runtime and @flamapy/plugin-api as externals.
//
// Try it (from the flamapy-ide repo):
//   npx serve --cors examples/remote-hello-plugin
//   → enable the experimental Remote plugins flag in the IDE (cloud icon, activity bar)
//   → load http://localhost:3000/hello-plugin.js
import { createElement, useState } from "react";

function HelloView() {
  const [count, setCount] = useState(0);
  return createElement(
    "div",
    { className: "flex-1 flex flex-col items-center justify-center gap-3" },
    createElement("p", { className: "text-lg" }, "Hello from a remotely loaded plugin!"),
    createElement(
      "button",
      {
        className: "px-3 py-1 rounded bg-blue-600 text-white",
        onClick: () => setCount(count + 1),
      },
      `Shared React works: clicked ${count} times`,
    ),
  );
}

function HelloStatusItem() {
  return createElement(
    "span",
    { className: "px-2 h-full flex items-center", title: "remote-hello-plugin is active" },
    "👋 remote",
  );
}

export default {
  manifest: {
    id: "example.remote-hello",
    name: "Remote Hello",
    version: "1.0.0",
  },
  activate(ctx) {
    ctx.subscriptions.push(
      ctx.shell.views.register({
        id: "example.remote-hello.view",
        title: "Hello",
        order: 99,
        component: HelloView,
      }),
    );
    ctx.subscriptions.push(
      ctx.shell.statusBar.registerItem({
        id: "example.remote-hello.status",
        side: "right",
        component: HelloStatusItem,
      }),
    );
    ctx.shell.output.show("Remote Hello", "The remote example plugin activated.");
  },
};
