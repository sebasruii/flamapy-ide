// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { PluginHost, createServiceRegistry } from '@flamapy/plugin-api';
import type { ShellApi, ViewDescriptor } from '@flamapy/plugin-api';
import { Analysis, type AnalysisService } from '@flamapy/plugin-flamapy-engine';

import { constraintsFrom, graphViewPlugin, GRAPH_VIEW_ID } from './plugin';

function fakeAnalysis(): AnalysisService {
  return {
    validation: { valid: true },
    onValidationChange: () => ({ dispose() {} }),
    validateNow: async () => ({ valid: true }),
    ensureValidated: async () => ({ valid: true }),
    getFeatureTree: async () => ({ name: 'Root', children: [] }),
    getFeatures: async () => [],
    getNumericalAttributes: async () => [],
    runOperation: async () => null,
    runOperationWithConfig: async () => null,
    exportModel: async () => '',
    describeError: () => '',
    computeBackend: 'wasm',
    restApiUrl: '',
    setComputeBackend() {},
    setRestApiUrl() {},
    onComputeBackendChange: () => ({ dispose() {} }),
    selectedSolver: 'sat',
    setSelectedSolver() {},
    onSelectedSolverChange: () => ({ dispose() {} }),
  };
}

function shellWithViews(views: ViewDescriptor[]): ShellApi {
  return {
    documents: {
      getText: () => 'features\n\tRoot\nconstraints\n\tRoot => Root',
      version: 0,
      dirty: false,
      setText() {},
      markSaved() {},
      onDidChange: () => ({ dispose() {} }),
    },
    views: {
      register(view) {
        views.push(view);
        return { dispose() {} };
      },
      open: async () => true,
      close() {},
      activeViewId: () => null,
      onDidChangeActive: () => ({ dispose() {} }),
    },
    sidebar: { register: () => ({ dispose() {} }) },
    toolbar: { registerMenu: () => ({ dispose() {} }) },
    statusBar: { registerItem: () => ({ dispose() {} }) },
    commands: { register: () => ({ dispose() {} }), execute: async () => null },
    output: { show() {} },
    problems: { set() {} },
    modals: { open() {} },
    fileHandlers: { register: () => ({ dispose() {} }) },
  };
}

describe('graph view plugin', () => {
  it('registers the gated graph view and its component renders', async () => {
    const views: ViewDescriptor[] = [];
    const services = createServiceRegistry();
    services.provide(Analysis, fakeAnalysis());
    const host = new PluginHost(shellWithViews(views), services);
    // Stub engine plugin: the Analysis service is provided directly above.
    host.register({
      manifest: { id: 'flamapy.engine', name: 'stub', version: '0' },
      activate() {},
    });
    host.register(graphViewPlugin);
    await host.activateAll();

    const view = views.find((candidate) => candidate.id === GRAPH_VIEW_ID);
    expect(view).toBeDefined();
    expect(await view!.onBeforeOpen!()).toEqual({ ok: true });
    const { container } = render(<view.component />);
    expect(container).toBeTruthy();
  });

  it('constraintsFrom extracts the constraints block lines', () => {
    expect(constraintsFrom('features\n\tA')).toBeNull();
    expect(constraintsFrom('features\n\tA\nconstraints\n\tA => B\n\n\t!C\n')).toEqual([
      'A => B',
      '!C',
    ]);
  });
});
