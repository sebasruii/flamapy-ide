// Shared-module shim: the shell's @flamapy/plugin-api for remote plugins
// (see shared/react.js). Types are erased; these are the runtime exports.
const api = globalThis.__flamapyShared?.pluginApi;
if (!api) {
  throw new Error("flamapy shared modules are not initialized (@flamapy/plugin-api)");
}
export const {
  PluginHost,
  createContributionStore,
  createPluginSettings,
  createServiceRegistry,
  isValidRemotePluginModule,
  loadRemotePlugin,
  serviceId,
} = api;
