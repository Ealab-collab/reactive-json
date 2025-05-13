/**
 * Merges component collections (aka plugins).
 * @param {[{}]} collections Array of plugin collections.
 * @return {{hook: {}, reaction: {}, action: {}, utility: {}, element: {}}}
 */
export function mergeComponentCollections(collections) {
    const mergedCollections = {
        "action": {},
        "element": {},
        "hook": {},
        "reaction": {},
        "utility": {},
    };

    collections.forEach((collection) => {
        for (const [k, v] of Object.entries(collection)) {
            if (!mergedCollections.hasOwnProperty(k)) {
                mergedCollections[k] = [];
            }

            for (const [componentName, Component] of Object.entries(v)) {
                mergedCollections[k][componentName] = Component;
            }
        }
    });

    return mergedCollections;
}
