import {
  PluginHost,
  createContributionStore,
  createServiceRegistry,
  type ContributionStore,
  type Disposable,
  type DocumentStore,
  type FileHandlerDescriptor,
  type Marker,
  type ServiceRegistry,
  type ShellApi,
  type SidebarPanelDescriptor,
  type StatusBarItemDescriptor,
  type ToolbarMenuDescriptor,
  type ViewDescriptor,
} from '@flamapy/plugin-api';
import type { ReactNode } from 'react';

import { createDocumentStore } from './documentStore';

/**
 * Delegates the React shell fills in each render: plugin-facing shell calls land here so
 * they use the freshest component state. Assigned by EditorPage/Workbench; every field is
 * safe to call before assignment (no-ops).
 */
export interface ShellDelegates {
  showOutput(label: string, result: unknown): void;
  openModal(render: (close: () => void) => ReactNode): void;
  /** Switch the main view (after the descriptor's onBeforeOpen guard passed). */
  setActiveView(id: string): void;
  getActiveView(): string | null;
}

export interface Workbench {
  host: PluginHost;
  services: ServiceRegistry;
  shell: ShellApi;
  documents: DocumentStore;
  delegates: ShellDelegates;
  stores: {
    views: ContributionStore<ViewDescriptor>;
    sidebarPanels: ContributionStore<SidebarPanelDescriptor>;
    toolbarMenus: ContributionStore<ToolbarMenuDescriptor>;
    statusBarItems: ContributionStore<StatusBarItemDescriptor>;
  };
  problems: {
    /** Markers per source, replaced wholesale by ShellApi.problems.set. */
    get(): ReadonlyMap<string, readonly Marker[]>;
    subscribe(listener: () => void): () => void;
  };
  fileHandlers: {
    /** The handler claiming this extension, longest-extension match first. */
    forExtension(extension: string): FileHandlerDescriptor | undefined;
  };
  notifyActiveViewChanged(id: string | null): void;
}

export function createWorkbench(initialText = ''): Workbench {
  const documents = createDocumentStore(initialText);
  const services = createServiceRegistry();

  const views = createContributionStore<ViewDescriptor>();
  const sidebarPanels = createContributionStore<SidebarPanelDescriptor>();
  const toolbarMenus = createContributionStore<ToolbarMenuDescriptor>();
  const statusBarItems = createContributionStore<StatusBarItemDescriptor>();

  const delegates: ShellDelegates = {
    showOutput: () => {},
    openModal: () => {},
    setActiveView: () => {},
    getActiveView: () => null,
  };

  const commandHandlers = new Map<string, (args?: unknown) => unknown>();

  const activeViewListeners = new Set<(id: string | null) => void>();

  const markersBySource = new Map<string, readonly Marker[]>();
  const problemListeners = new Set<() => void>();

  const handlers: FileHandlerDescriptor[] = [];

  const shell: ShellApi = {
    documents,
    views: {
      register: (view) => views.register(view),
      async open(id) {
        const view = views.get(id);
        if (!view) {
          return false;
        }
        if (view.onBeforeOpen) {
          const gate = await view.onBeforeOpen();
          if (!gate.ok) {
            if (gate.message) {
              delegates.showOutput(view.title, gate.message);
            }
            return false;
          }
        }
        delegates.setActiveView(id);
        return true;
      },
      close(id) {
        if (delegates.getActiveView() === id) {
          delegates.setActiveView('source');
        }
      },
      activeViewId: () => delegates.getActiveView(),
      onDidChangeActive(listener): Disposable {
        activeViewListeners.add(listener);
        return { dispose: () => void activeViewListeners.delete(listener) };
      },
    },
    sidebar: {
      register: (panel) => sidebarPanels.register(panel),
    },
    toolbar: {
      registerMenu: (menu) => toolbarMenus.register(menu),
    },
    statusBar: {
      registerItem: (item) => statusBarItems.register(item),
    },
    commands: {
      register(id, handler): Disposable {
        if (commandHandlers.has(id)) {
          throw new Error(`Command '${id}' is already registered.`);
        }
        commandHandlers.set(id, handler);
        return { dispose: () => void commandHandlers.delete(id) };
      },
      async execute(id, args) {
        const handler = commandHandlers.get(id);
        if (!handler) {
          throw new Error(`Command '${id}' is not registered.`);
        }
        return await handler(args);
      },
    },
    output: {
      show: (label, result) => delegates.showOutput(label, result),
    },
    problems: {
      set(source, markers) {
        markersBySource.set(source, markers);
        for (const listener of problemListeners) {
          listener();
        }
      },
    },
    modals: {
      open: (render) => delegates.openModal(render),
    },
    fileHandlers: {
      register(handler): Disposable {
        handlers.push(handler);
        return {
          dispose() {
            const index = handlers.indexOf(handler);
            if (index >= 0) {
              handlers.splice(index, 1);
            }
          },
        };
      },
    },
  };

  const host = new PluginHost(shell, services);

  return {
    host,
    services,
    shell,
    documents,
    delegates,
    stores: { views, sidebarPanels, toolbarMenus, statusBarItems },
    problems: {
      get: () => markersBySource,
      subscribe(listener) {
        problemListeners.add(listener);
        return () => problemListeners.delete(listener);
      },
    },
    fileHandlers: {
      forExtension(extension) {
        // Longest match wins so 'gfm.json' beats 'json'.
        return handlers
          .flatMap((handler) =>
            handler.extensions
              .filter((known) => extension === known || extension.endsWith(`.${known}`) || known === extension)
              .map((known) => ({ handler, length: known.length })),
          )
          .sort((a, b) => b.length - a.length)[0]?.handler;
      },
    },
    notifyActiveViewChanged(id) {
      for (const listener of [...activeViewListeners]) {
        listener(id);
      }
    },
  };
}
