import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  });
});

import type { WorkerClient, WorkerClientState } from '@flamapy/web-core';
import { createWorkerServices } from './workerService';

function fakeClient() {
  let state: WorkerClientState = { isLoaded: false, pluginsConfig: null, pluginCatalog: null };
  const listeners = new Set<(state: WorkerClientState) => void>();
  const installs: unknown[] = [];
  const client: WorkerClient = {
    start() {},
    getState: () => state,
    onStateChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    call: async () => null,
    async installPlugin(data) {
      installs.push(data);
      return null;
    },
    interrupt: () => false,
    restart() {},
    terminate() {},
  };
  return {
    client,
    installs,
    emit(next: Partial<WorkerClientState>) {
      state = { ...state, ...next };
      for (const listener of [...listeners]) listener(state);
    },
  };
}

describe('worker services', () => {
  it('re-applies remembered Python plugin installs when the worker loads', async () => {
    storage.set(
      'flamapy-ide-installed-plugins',
      JSON.stringify([{ wheelRefs: ['a.whl'], key: 'sharpsat' }]),
    );
    const { client, installs, emit } = fakeClient();
    createWorkerServices(client);
    emit({ isLoaded: true });
    await Promise.resolve(); // let the async re-apply run
    expect(installs).toEqual([{ wheelRefs: ['a.whl'], pyodidePackages: undefined }]);
  });

  it('re-applies again after a restart cycle (fresh worker has only bundled defaults)', async () => {
    storage.set('flamapy-ide-installed-plugins', JSON.stringify([{ wheelRefs: ['a.whl'] }]));
    const { client, installs, emit } = fakeClient();
    createWorkerServices(client);
    emit({ isLoaded: true });
    await Promise.resolve();
    emit({ isLoaded: false }); // restart
    emit({ isLoaded: true });
    await Promise.resolve();
    expect(installs).toHaveLength(2);
  });

  it('installPythonPlugin persists new descriptors once (deduplicated by signature)', async () => {
    const { client, emit } = fakeClient();
    const services = createWorkerServices(client);
    emit({ isLoaded: true });
    await services.worker.installPythonPlugin({ wheelRefs: ['x.whl'], key: 'x' });
    await services.worker.installPythonPlugin({ wheelRefs: ['x.whl'], key: 'x' });
    const remembered = JSON.parse(storage.get('flamapy-ide-installed-plugins')!);
    expect(remembered).toHaveLength(1);
  });

  it('exposes catalog changes to subscribers', () => {
    const { client, emit } = fakeClient();
    const services = createWorkerServices(client);
    const listener = vi.fn();
    services.catalog.onDidChange(listener);
    emit({ pluginCatalog: { plugins: [], operations: [] } });
    expect(listener).toHaveBeenCalledOnce();
    expect(services.catalog.catalog).toEqual({ plugins: [], operations: [] });
  });
});
