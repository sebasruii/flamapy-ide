// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { featuredrawPlugin, DIAGRAM_VIEW_ID, SYNC_ORIGIN } from '@flamapy/plugin-featuredraw';

import { createWorkbench } from './createWorkbench';

const MODEL = 'features\n\tRoot\n\t\toptional\n\t\t\tChild\n';

describe('featuredraw plugin against the real workbench', () => {
  it('activates, registers the Diagram view and syncs through the shell document', async () => {
    vi.useFakeTimers();
    const workbench = createWorkbench(MODEL);
    let active: string | null = 'source';
    workbench.delegates.setActiveView = (id) => {
      active = id;
      workbench.notifyActiveViewChanged(id);
    };
    workbench.delegates.getActiveView = () => active;

    workbench.host.register(featuredrawPlugin as never);
    await workbench.host.activateAll();
    expect(workbench.host.get('featuredraw')?.state).toBe('active');

    const view = workbench.stores.views.get(DIAGRAM_VIEW_ID);
    expect(view).toBeDefined();

    // Opening hydrates from the document (via onBeforeOpen + active-view change).
    expect(await workbench.shell.views.open(DIAGRAM_VIEW_ID)).toBe(true);
    expect(active).toBe(DIAGRAM_VIEW_ID);

    // A foreign document edit while the diagram is active re-hydrates on reopen; and a
    // featuredraw-origin write reaches the shell document.
    workbench.documents.setText(MODEL + '\t\toptional\n\t\t\tExtra\n', 'editor');
    await workbench.shell.views.open(DIAGRAM_VIEW_ID);

    const before = workbench.documents.version;
    workbench.documents.setText('features\n\tRoot\n', SYNC_ORIGIN);
    expect(workbench.documents.version).toBe(before + 1);

    await workbench.host.deactivateAll();
    vi.useRealTimers();
  });
});
