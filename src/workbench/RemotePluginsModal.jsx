/* eslint-disable react/prop-types */
import { useState } from "react";
import Modal from "@flamapy/web-ui/src/ui/Modal.jsx";

// Experimental: load workbench plugins from remote ESM bundle URLs. The flag gates the
// loader itself; URLs are persisted and loaded on every startup while enabled. Remote
// bundles must default-export { manifest, activate } and be built with react, react-dom,
// react/jsx-runtime and @flamapy/plugin-api as externals (resolved via the page's import
// map to the shell's instances). The host must send CORS headers (the page runs with
// COEP: credentialless).
function RemotePluginsModal({ enabled, urls, onToggle, onAdd, onRemove, onClose }) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState(null);
  const urlValid = /^https?:\/\/.+\.(js|mjs)$/i.test(url.trim()) || url.trim().startsWith("http://localhost");

  async function add() {
    setMessage(null);
    try {
      await onAdd(url.trim());
      setUrl("");
      setMessage({ ok: true, text: "Plugin loaded and remembered." });
    } catch (error) {
      setMessage({ ok: false, text: error.message });
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-bold mb-1 text-gray-800 dark:text-gray-200">
        Remote plugins <span className="text-xs font-normal align-middle px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">experimental</span>
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Load workbench plugins from any URL serving an ESM bundle (CORS required). Only
        install plugins you trust: they run with full access to this page.
      </p>

      <label className="flex items-center gap-2 mb-4 text-sm text-gray-800 dark:text-gray-200">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        Enable remote plugin loading
      </label>

      {enabled && (
        <>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 px-2 py-1 text-sm rounded border border-black/20 dark:border-white/20 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="https://example.com/my-plugin.js"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              className="px-3 py-1 text-sm rounded bg-accent text-white disabled:opacity-50"
              disabled={!urlValid}
              onClick={add}
            >
              Load
            </button>
          </div>
          {message && (
            <p className={`text-xs mb-2 ${message.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {message.text}
            </p>
          )}
          <ul className="space-y-1">
            {urls.map((entry) => (
              <li key={entry} className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-200">
                <span className="truncate mr-2">{entry}</span>
                <button
                  className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0"
                  onClick={() => onRemove(entry)}
                  title="Forget this plugin (takes effect on reload)"
                >
                  Remove
                </button>
              </li>
            ))}
            {urls.length === 0 && (
              <li className="text-xs text-gray-500 dark:text-gray-400">No remote plugins configured.</li>
            )}
          </ul>
        </>
      )}
    </Modal>
  );
}

export default RemotePluginsModal;
