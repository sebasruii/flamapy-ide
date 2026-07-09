/**
 * The flamapy-ide plugin contract.
 *
 * A plugin is `{ manifest, activate }`. The manifest is identity-only (id, name, version,
 * dependencies); every contribution — views, toolbar menus, status-bar items, commands,
 * services — is registered imperatively inside `activate(ctx)` and undone by disposing
 * what the registration returned. There is no declarative contribution schema: all
 * plugins activate at workbench startup, and contributions derived from runtime state
 * (e.g. the Python operation catalog) register and dispose dynamically.
 */
import type { ComponentType, ReactNode } from 'react';

export interface Disposable {
  dispose(): void;
}

export interface PluginManifest {
  /** Globally unique, stable id, e.g. `flamapy.engine` or `featuredraw`. */
  id: string;
  name: string;
  version: string;
  /** Plugin ids that must activate before this one. */
  dependencies?: string[];
  /**
   * Reserved for remote plugins: the plugin-api version range the bundle was built
   * against. Recorded but not yet enforced.
   */
  engines?: { pluginApi?: string };
}

export interface FlamapyPlugin {
  manifest: PluginManifest;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export interface PluginContext {
  shell: ShellApi;
  services: ServiceRegistry;
  /** Disposed automatically (in reverse order) when the plugin deactivates. */
  subscriptions: Disposable[];
  /** localStorage-backed key/value settings, namespaced by the plugin id. */
  settings: PluginSettings;
}

export interface PluginSettings {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
}

// ---------------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------------

/**
 * A branded service key: carries the service's interface type so `registry.get(Id)`
 * returns it fully typed. Create with `serviceId<MyService>('my.service.id')`.
 */
export type ServiceId<T> = string & { readonly __serviceType?: T };

export function serviceId<T>(id: string): ServiceId<T> {
  return id as ServiceId<T>;
}

export interface ServiceRegistry {
  provide<T>(id: ServiceId<T>, implementation: T): Disposable;
  /** Throws if the service is not (yet) provided. */
  get<T>(id: ServiceId<T>): T;
  tryGet<T>(id: ServiceId<T>): T | undefined;
  /** Resolves immediately if provided, otherwise when `provide` is first called. */
  whenAvailable<T>(id: ServiceId<T>): Promise<T>;
}

// ---------------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------------

export interface DocumentChange {
  text: string;
  version: number;
  /** Who produced the change: 'editor', 'import', 'featuredraw', 'collab', ... */
  origin: string;
}

/** The shell-owned UVL document. Single instance today; the API leaves room for more. */
export interface DocumentStore {
  getText(): string;
  readonly version: number;
  readonly dirty: boolean;
  setText(text: string, origin: string): void;
  markSaved(): void;
  onDidChange(listener: (change: DocumentChange) => void): Disposable;
}

// ---------------------------------------------------------------------------------
// Shell contributions
// ---------------------------------------------------------------------------------

export interface ViewDescriptor {
  /** Unique view id, e.g. `flamapy.view.graph`. Also the tab identity. */
  id: string;
  title: string;
  /** Icon element rendered in the tab strip / activity bar (optional). */
  icon?: ReactNode;
  /** The main-panel component. Services arrive via the plugin's activate closure. */
  component: ComponentType;
  /** Dynamic views appear as a tab only while open (e.g. Pareto front). */
  dynamic?: boolean;
  /** Keep the component mounted (hidden) when another view is active (e.g. monaco). */
  keepMounted?: boolean;
  /** Gate opening (e.g. "model must be valid"). Rejecting keeps the current view. */
  onBeforeOpen?(): Promise<{ ok: boolean; message?: string }>;
  /** Sort order in the tab strip; lower first. Defaults to registration order. */
  order?: number;
}

export interface SidebarPanelDescriptor {
  id: string;
  title: string;
  side: 'left' | 'right';
  icon?: ReactNode;
  component: ComponentType;
  order?: number;
}

export interface ToolbarActionDescriptor {
  id: string;
  label: string;
  /** Executed on click. Prefer `commands.execute` for cross-plugin actions. */
  run(): void | Promise<void>;
  disabled?: boolean;
  title?: string;
}

export interface ToolbarMenuDescriptor {
  id: string;
  label: string;
  actions: ToolbarActionDescriptor[];
  order?: number;
}

export interface StatusBarItemDescriptor {
  id: string;
  /** Rendered as-is in the status bar. */
  component: ComponentType;
  side: 'left' | 'right';
  order?: number;
}

export interface Marker {
  message: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  column?: number;
}

export interface FileHandlerDescriptor {
  /** Extensions without the dot, e.g. ['afm', 'xml', 'gfm.json']. */
  extensions: string[];
  /** Convert foreign content to UVL text (may call engine services). */
  importToUVL(content: string, extension: string): Promise<string>;
}

export interface ShellApi {
  documents: DocumentStore;
  views: {
    register(view: ViewDescriptor): Disposable;
    open(id: string): Promise<boolean>;
    close(id: string): void;
    activeViewId(): string | null;
    onDidChangeActive(listener: (id: string | null) => void): Disposable;
  };
  sidebar: {
    register(panel: SidebarPanelDescriptor): Disposable;
  };
  toolbar: {
    registerMenu(menu: ToolbarMenuDescriptor): Disposable;
  };
  statusBar: {
    registerItem(item: StatusBarItemDescriptor): Disposable;
  };
  commands: {
    register(id: string, handler: (args?: unknown) => unknown): Disposable;
    execute(id: string, args?: unknown): Promise<unknown>;
  };
  output: {
    /** Show an operation result in the bottom panel. */
    show(label: string, result: unknown): void;
  };
  problems: {
    /** Replace this source's markers (e.g. validation diagnostics). */
    set(source: string, markers: Marker[]): void;
  };
  modals: {
    open(render: (close: () => void) => ReactNode): void;
  };
  fileHandlers: {
    register(handler: FileHandlerDescriptor): Disposable;
  };
}
