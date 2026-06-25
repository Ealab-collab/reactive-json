import { joinSyncGroup, broadcastToGroup, getOwner, __resetGroups } from "./dataSyncGroups.js";

/**
 * Reactive-json core utility components.
 *
 * Utilities are plain (non-React) services injected through the plugin
 * collection under `plugins.utility`. A component resolves one from the global
 * data context — `globalDataContext.plugins?.utility?.<name>` — falling back to
 * the core default below, so an app can override JUST that service by
 * registering its own entry (no need to override the whole consuming element).
 *
 * `dataSyncGroups` is the shared-syncable coordination registry consumed by
 * DataSync (see ./dataSyncGroups.js). It is a singleton: every consumer that
 * resolves this same object shares one group registry.
 */
export const coreUtilityComponents = {
    dataSyncGroups: { joinSyncGroup, broadcastToGroup, getOwner, __resetGroups },
};

export * from "./dataSyncGroups.js";
