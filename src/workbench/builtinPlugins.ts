import type { FlamapyPlugin } from '@flamapy/plugin-api';

/**
 * First-party plugins compiled into the IDE, activated at workbench startup in
 * dependency order. The engine and view plugins register here as they are extracted
 * from the legacy EditorPage orchestration.
 */
export const builtinPlugins: FlamapyPlugin[] = [];
