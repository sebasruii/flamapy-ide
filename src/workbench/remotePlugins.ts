import { createPluginSettings, loadRemotePlugin } from '@flamapy/plugin-api';

import type { Workbench } from './createWorkbench';

// Shell settings namespace for the experimental remote-plugin loader.
const settings = createPluginSettings('shell');
const FLAG_KEY = 'experimental.remotePlugins';
const URLS_KEY = 'remotePlugins.urls';

export function remotePluginsEnabled(): boolean {
  return settings.get(FLAG_KEY, false);
}

export function setRemotePluginsEnabled(enabled: boolean): void {
  settings.set(FLAG_KEY, enabled);
}

export function remotePluginUrls(): string[] {
  return settings.get<string[]>(URLS_KEY, []);
}

export function forgetRemotePlugin(url: string): void {
  settings.set(
    URLS_KEY,
    remotePluginUrls().filter((entry) => entry !== url),
  );
}

/** Load one remote plugin into the running workbench and remember its URL. */
export async function addRemotePlugin(workbench: Workbench, url: string): Promise<void> {
  const plugin = await loadRemotePlugin(url, { enabled: remotePluginsEnabled() });
  const record = await workbench.host.activateOne(plugin);
  if (record.state !== 'active') {
    throw new Error(`Plugin '${plugin.manifest.id}' failed to activate.`);
  }
  const urls = remotePluginUrls();
  if (!urls.includes(url)) {
    settings.set(URLS_KEY, [...urls, url]);
  }
}

/** Startup: load every remembered remote plugin (no-op while the flag is off). */
export async function loadRememberedRemotePlugins(workbench: Workbench): Promise<void> {
  if (!remotePluginsEnabled()) {
    return;
  }
  for (const url of remotePluginUrls()) {
    try {
      const plugin = await loadRemotePlugin(url, { enabled: true });
      await workbench.host.activateOne(plugin);
    } catch (error) {
      console.error(`Failed to load remote plugin from ${url}`, error); // eslint-disable-line no-console
    }
  }
}
