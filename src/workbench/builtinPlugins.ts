import type { FlamapyPlugin } from '@flamapy/plugin-api';
import { flamapyEnginePlugin } from '@flamapy/plugin-flamapy-engine';
import { graphViewPlugin } from '@flamapy/plugin-view-graph';

/**
 * First-party plugins compiled into the IDE, activated at workbench startup in
 * dependency order. The remaining view plugins register here as they are extracted
 * from the legacy EditorPage orchestration.
 */
export const builtinPlugins: FlamapyPlugin[] = [flamapyEnginePlugin, graphViewPlugin];
