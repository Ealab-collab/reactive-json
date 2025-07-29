/**
 * Merges component collections (aka plugins).
 * @param {[{}]} collections Array of plugin collections.
 * @return {{hook: {}, reaction: {}, action: {}, utility: {}, element: {}, dataProcessor: {}}}
 */
export function mergeComponentCollections(collections) {
    const mergedCollections = {
        "action": {},
        "element": {},
        "hook": {},
        "reaction": {},
        "utility": {},
        "dataProcessor": {},
    };

    collections.forEach((collection) => {
        for (const [k, v] of Object.entries(collection)) {
            if (!mergedCollections.hasOwnProperty(k)) {
                // Dynamic plugin keys.
                mergedCollections[k] = {};
            }

            for (const [componentName, Component] of Object.entries(v)) {
                mergedCollections[k][componentName] = Component;
            }
        }
    });

    // Sort dataProcessor items by the "order" property, and their name when the order is the same.
    const dataProcessorEntries = Object.entries(mergedCollections.dataProcessor);
    
    // Sort by order, then by name when the order is the same.
    dataProcessorEntries.sort((a, b) => {
        const [nameA, processorA] = a;
        const [nameB, processorB] = b;
        
        // Sort by order first.
        const orderA = processorA?.order || 0;
        const orderB = processorB?.order || 0;
        const orderComparison = orderA - orderB;
        if (orderComparison !== 0) {
            return orderComparison;
        }
        
        // Sort by name when the order is the same.
        return nameA.localeCompare(nameB);
    });
    
    // Rebuild the object with the sorted entries.
    mergedCollections.dataProcessor = Object.fromEntries(dataProcessorEntries);

    return mergedCollections;
}
