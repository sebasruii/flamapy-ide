import { describe, expect, it, vi } from 'vitest';

import { PluginHost } from './pluginHost';
import { createServiceRegistry } from './serviceRegistry';
import type { FlamapyPlugin, ShellApi } from './types';

const shell = {} as ShellApi; // the host never dereferences it itself

function makeHost(log = vi.fn()) {
  return { host: new PluginHost(shell, createServiceRegistry(), log), log };
}

function plugin(
  id: string,
  options: {
    dependencies?: string[];
    activate?: FlamapyPlugin['activate'];
    deactivate?: FlamapyPlugin['deactivate'];
  } = {},
): FlamapyPlugin {
  return {
    manifest: { id, name: id, version: '0.0.0', dependencies: options.dependencies },
    activate: options.activate ?? (() => {}),
    deactivate: options.deactivate,
  };
}

describe('PluginHost activation', () => {
  it('activates dependencies before dependents regardless of registration order', async () => {
    const { host } = makeHost();
    const order: string[] = [];
    host.register(plugin('c', { dependencies: ['b'], activate: () => void order.push('c') }));
    host.register(plugin('a', { activate: () => void order.push('a') }));
    host.register(plugin('b', { dependencies: ['a'], activate: () => void order.push('b') }));
    await host.activateAll();
    expect(order).toEqual(['a', 'b', 'c']);
    expect(host.list().every((record) => record.state === 'active')).toBe(true);
  });

  it('throws on dependency cycles', async () => {
    const { host } = makeHost();
    host.register(plugin('a', { dependencies: ['b'] }));
    host.register(plugin('b', { dependencies: ['a'] }));
    await expect(host.activateAll()).rejects.toThrow(/cycle/);
  });

  it('throws when a dependency is not registered', async () => {
    const { host } = makeHost();
    host.register(plugin('a', { dependencies: ['ghost'] }));
    await expect(host.activateAll()).rejects.toThrow(/'ghost'/);
  });

  it('rejects duplicate plugin ids', () => {
    const { host } = makeHost();
    host.register(plugin('a'));
    expect(() => host.register(plugin('a'))).toThrow(/already registered/);
  });

  it('isolates an activation failure and skips its dependents', async () => {
    const { host, log } = makeHost();
    host.register(
      plugin('broken', {
        activate: () => {
          throw new Error('boom');
        },
      }),
    );
    host.register(plugin('dependent', { dependencies: ['broken'] }));
    host.register(plugin('bystander'));
    await host.activateAll();
    expect(host.get('broken')?.state).toBe('failed');
    expect(host.get('dependent')?.state).toBe('skipped');
    expect(host.get('bystander')?.state).toBe('active');
    expect(log).toHaveBeenCalled();
  });

  it('disposes the failed plugin partial subscriptions', async () => {
    const { host } = makeHost();
    const dispose = vi.fn();
    host.register(
      plugin('broken', {
        activate: (ctx) => {
          ctx.subscriptions.push({ dispose });
          throw new Error('boom');
        },
      }),
    );
    await host.activateAll();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('activateOne registers and activates late plugins (remote loading path)', async () => {
    const { host } = makeHost();
    host.register(plugin('base'));
    await host.activateAll();
    const record = await host.activateOne(plugin('late', { dependencies: ['base'] }));
    expect(record.state).toBe('active');
  });
});

describe('PluginHost deactivation', () => {
  it('deactivates in reverse order and disposes subscriptions newest-first', async () => {
    const { host } = makeHost();
    const events: string[] = [];
    for (const id of ['a', 'b']) {
      host.register(
        plugin(id, {
          dependencies: id === 'b' ? ['a'] : undefined,
          activate: (ctx) => {
            ctx.subscriptions.push({ dispose: () => void events.push(`${id}.sub1`) });
            ctx.subscriptions.push({ dispose: () => void events.push(`${id}.sub2`) });
          },
          deactivate: () => void events.push(`${id}.deactivate`),
        }),
      );
    }
    await host.activateAll();
    await host.deactivateAll();
    expect(events).toEqual([
      'b.deactivate', 'b.sub2', 'b.sub1',
      'a.deactivate', 'a.sub2', 'a.sub1',
    ]);
    expect(host.list().every((record) => record.state === 'deactivated')).toBe(true);
  });
});
