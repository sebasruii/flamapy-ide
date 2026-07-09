import type { ContributionStore, ToolbarMenuDescriptor } from '@flamapy/plugin-api';
// @ts-expect-error web-ui is untyped JSX
import { DropdownMenu, vsGroupLabel, vsGroupSep } from '@flamapy/web-ui';

import { useContributionStore } from '../useContributionStore';

const dropdownTrigger =
  'inline-flex items-center justify-between gap-1 px-2.5 py-1 text-[12px] rounded-md text-gray-700 dark:text-gray-200 hover:bg-black/[.06] dark:hover:bg-white/10 transition-colors';

/** Plugin-contributed toolbar menus, appended after the hardcoded toolbar groups. */
export function ToolbarMenuSlot({ store }: { store: ContributionStore<ToolbarMenuDescriptor> }) {
  const menus = useContributionStore(store);
  if (menus.length === 0) {
    return null;
  }
  return (
    <>
      {menus.map((menu) => (
        <div key={menu.id} className="flex items-center gap-3">
          <div className={vsGroupSep} />
          <div className="flex flex-col items-start gap-0.5">
            <span className={vsGroupLabel}>{menu.label}</span>
            <div className="flex items-center gap-1">
              <DropdownMenu
                buttonLabel="Operations"
                options={menu.actions.map((action) => ({ ...action, value: action.id }))}
                executeAction={(action: { run: () => void }) => action.run()}
                className={`${dropdownTrigger} min-w-[120px]`}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
