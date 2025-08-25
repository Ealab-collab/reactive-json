import { isTemplateValue } from "../TemplateSystem.jsx";

/**
 * Recursively analyze the dataOverride to detect references to parent data.
 *
 * @param {any} dataOverride - The dataOverride object to analyze.
 * @param {string} currentPath - The current path in the tree of the dataOverride object. Usually empty.
 * @param {object} options - The options for the analysis.
 * @param {number} options.maxDepth - The maximum depth to traverse the dataOverride object. Default is 50.
 * @returns {Map<string, string>} - A Map that associates paths in dataOverride to template references.
 *    For example: "path.in.dataOverride" -> "~~.reference.value".
 */
export const analyzeDataOverrideReferences = (dataOverride, currentPath = "", options = {}) => {
    const references = new Map();

    if (!dataOverride) {
        return references;
    }

    if (typeof dataOverride === "string" && isTemplateValue(dataOverride)) {
        // The reference is the value itself, for example: "~~.value".
        // Map it to the empty (root) path.
        references.set("", dataOverride);
        return references;
    }

    const MAX_DEPTH = parseInt(options.maxDepth) || 50;

    /**
     * Traverses the dataOverrideobject recursively.
     * @param {any} obj - The object to traverse.
     * @param {string} path - The current path in the tree (for recursion).
     * @param {Set<object>} traversedObjects - The set of objects that have already been traversed.
     */
    const traverseObject = (obj, path, traversedObjects = new Set(), currentDepth = 0) => {
        if (currentDepth > MAX_DEPTH) {
            console.warn(
                "Reactive-JSON: Maximum depth reached in dataOverride references analysis (traverseObject). Stopped the analysis."
            );
            return;
        }

        if (traversedObjects.has(obj)) {
            console.warn(
                "Reactive-JSON: Infinite recursion detected in dataOverride references analysis (traverseObject). Stopped the analysis."
            );
            return;
        }

        traversedObjects.add(obj);

        if (typeof obj === "string" && isTemplateValue(obj)) {
            references.set(path, obj);
            return;
        }

        if (!obj || typeof obj !== "object") {
            // Not a valid traversable object.
            return;
        }

        if (Array.isArray(obj)) {
            // Process the array items recursively.
            obj.forEach((item, index) => {
                const newPath = path ? `${path}.${index}` : index.toString();
                traverseObject(item, newPath, traversedObjects, currentDepth + 1);
            });

            return;
        }

        // It's an object, traverse its properties recursively.
        Object.entries(obj).forEach(([key, value]) => {
            const newPath = path ? `${path}.${key}` : key;
            traverseObject(value, newPath, traversedObjects, currentDepth + 1);
        });
    };

    traverseObject(dataOverride, currentPath);
    return references;
};
