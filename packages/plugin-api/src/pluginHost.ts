import { createPluginSettings } from './settings';
import type {
  Disposable,
  FlamapyPlugin,
  PluginContext,
  ServiceRegistry,
  ShellApi,
} from './types';

export type PluginState = 'registered' | 'active' | 'failed' | 'skipped' | 'deactivated';

export interface PluginRecord {
  plugin: FlamapyPlugin;
  state: PluginState;
  error?: unknown;
}

/**
 * Registers plugins and activates them in dependency order.
 *
 * - `activateAll` topologically sorts by `manifest.dependencies`; a dependency cycle or
 *   a dependency on an unregistered id is a registration error (throws — that's a
 *   programming mistake, not a runtime condition).
 * - A plugin whose `activate` throws is isolated: it is marked `failed`, its dependents
 *   are marked `skipped`, and the rest of the workbench keeps going.
 * - `deactivateAll` runs in reverse activation order, disposing each plugin's
 *   `subscriptions` (newest first) after its `deactivate()`.
 */
export class PluginHost {
  private records = new Map<string, PluginRecord>();
  private contexts = new Map<string, PluginContext>();
  private activationOrder: string[] = [];

  constructor(
    private shell: ShellApi,
    private services: ServiceRegistry,
    private log: (message: string, error?: unknown) => void = (message, error) =>
      console.error(message, error), // eslint-disable-line no-console
  ) {}

  register(plugin: FlamapyPlugin): void {
    const { id } = plugin.manifest;
    if (this.records.has(id)) {
      throw new Error(`Plugin '${id}' is already registered.`);
    }
    this.records.set(id, { plugin, state: 'registered' });
  }

  get(id: string): PluginRecord | undefined {
    return this.records.get(id);
  }

  list(): PluginRecord[] {
    return [...this.records.values()];
  }

  /** Dependency-ordered ids of every registered plugin. Throws on cycles/missing deps. */
  private sorted(): string[] {
    const order: string[] = [];
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string, requiredBy?: string): void => {
      if (done.has(id)) {
        return;
      }
      if (visiting.has(id)) {
        throw new Error(`Plugin dependency cycle involving '${id}'.`);
      }
      const record = this.records.get(id);
      if (!record) {
        throw new Error(
          `Plugin '${requiredBy}' depends on '${id}', which is not registered.`,
        );
      }
      visiting.add(id);
      for (const dependency of record.plugin.manifest.dependencies ?? []) {
        visit(dependency, id);
      }
      visiting.delete(id);
      done.add(id);
      order.push(id);
    };
    for (const id of this.records.keys()) {
      visit(id);
    }
    return order;
  }

  async activateAll(): Promise<void> {
    for (const id of this.sorted()) {
      const record = this.records.get(id)!;
      if (record.state !== 'registered') {
        continue;
      }
      const dependencies = record.plugin.manifest.dependencies ?? [];
      const broken = dependencies.find(
        (dependency) => this.records.get(dependency)!.state !== 'active',
      );
      if (broken) {
        record.state = 'skipped';
        this.log(`Plugin '${id}' skipped: dependency '${broken}' is not active.`);
        continue;
      }
      const context: PluginContext = {
        shell: this.shell,
        services: this.services,
        subscriptions: [],
        settings: createPluginSettings(id),
      };
      this.contexts.set(id, context);
      try {
        await record.plugin.activate(context);
        record.state = 'active';
        this.activationOrder.push(id);
      } catch (error) {
        record.state = 'failed';
        record.error = error;
        this.disposeSubscriptions(context.subscriptions);
        this.log(`Plugin '${id}' failed to activate.`, error);
      }
    }
  }

  /** Register + activate one plugin after startup (used by the remote loader). */
  async activateOne(plugin: FlamapyPlugin): Promise<PluginRecord> {
    this.register(plugin);
    await this.activateAll();
    return this.records.get(plugin.manifest.id)!;
  }

  async deactivateAll(): Promise<void> {
    for (const id of [...this.activationOrder].reverse()) {
      const record = this.records.get(id)!;
      const context = this.contexts.get(id)!;
      try {
        await record.plugin.deactivate?.();
      } catch (error) {
        this.log(`Plugin '${id}' failed to deactivate.`, error);
      }
      this.disposeSubscriptions(context.subscriptions);
      record.state = 'deactivated';
    }
    this.activationOrder = [];
  }

  private disposeSubscriptions(subscriptions: Disposable[]): void {
    for (const subscription of [...subscriptions].reverse()) {
      try {
        subscription.dispose();
      } catch (error) {
        this.log('Error disposing a plugin subscription.', error);
      }
    }
    subscriptions.length = 0;
  }
}
