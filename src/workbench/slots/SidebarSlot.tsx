import type { ContributionStore, SidebarPanelDescriptor } from '@flamapy/plugin-api';

import { useContributionStore } from '../useContributionStore';

/** Plugin-contributed sidebar panels for one side of the workbench. */
export function SidebarSlot({
  store,
  side,
}: {
  store: ContributionStore<SidebarPanelDescriptor>;
  side: 'left' | 'right';
}) {
  const panels = useContributionStore(store).filter((panel) => panel.side === side);
  return (
    <>
      {panels.map((panel) => (
        <panel.component key={panel.id} />
      ))}
    </>
  );
}
