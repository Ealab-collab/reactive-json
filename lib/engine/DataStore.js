import { isEqual } from "lodash";

/**
 * A central store for managing reactive data.
 *
 * This implements a basic Pub/Sub pattern where components can subscribe
 * to specific paths in the data object.
 */
export class DataStore {
    /**
     * @param {Object} initialData The initial data object.
     */
    constructor(initialData = {}) {
        this.data = initialData;
        this.listeners = new Map(); // path -> Set<callback>
    }

    /**
     * Retrieves the value at the given path.
     *
     * @param {string} path Dot-separated path (e.g., "user.name").
     * @returns {*} The value at the path, or undefined.
     */
    get(path) {
        if (!path) {
            return this.data;
        }

        const keys = path.split(".");
        let current = this.data;

        for (const key of keys) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Updates the data at the given path and notifies listeners.
     *
     * @param {string} path Dot-separated path.
     * @param {*} value The new value.
     * @param {string} updateMode "add", "remove", "move", or default (replace).
     */
    set(path, value, updateMode = undefined) {
        if (path === "" || path === undefined || path === null) {
            this.data = value;
            this.notify("");
            return;
        }

        // Use the existing logic (adapted from ReactiveJsonRoot) to update the data immutably.
        // This returns a new root object, which is good for React.
        const result = this.updateDataObject(
            { realCurrentData: this.data },
            path,
            value,
            updateMode
        );

        // Update internal data reference.
        this.data = result.realCurrentData;

        // Notify listeners.
        this.notify(path);
    }

    /**
     * Subscribes to changes at the given path.
     *
     * @param {string} path The path to listen to.
     * @param {Function} callback Function to call when data changes.
     * @returns {Function} Unsubscribe function.
     */
    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);

        return () => {
            const set = this.listeners.get(path);
            if (set) {
                set.delete(callback);
                if (set.size === 0) {
                    this.listeners.delete(path);
                }
            }
        };
    }

    /**
     * Notifies listeners about a change at the given path.
     *
     * @param {string} changedPath The path that changed.
     */
    notify(changedPath) {
        // 1. Notify exact match listeners
        this.notifyListenersForPath(changedPath);

        // 2. Notify ancestor listeners (e.g., if "user.name" changes, notify "user" and root)
        let parent = changedPath;
        while (parent.includes('.')) {
            parent = parent.substring(0, parent.lastIndexOf('.'));
            this.notifyListenersForPath(parent);
        }
        // Notify root ("" or undefined depending on usage, let's assume root listeners use "")
        if (changedPath !== "") {
             this.notifyListenersForPath("");
        }

        // 3. Notify descendant listeners (e.g., if "user" changes, notify "user.name").
        //
        // Special case — root replacement (changedPath === ""): the whole tree was
        // swapped, so every path-subscribed listener must fire, not just the root one
        // handled in step 1. This is the `store.set("", newData)` path, reached when
        // the entire data root is replaced — a `setData` reaction, or an HTTP reaction
        // whose updateDataAtLocation resolves to "data" (see httpRequestCommon). On
        // those paths set("") is the ONLY notification (no re-render follows it), so
        // without this branch every view bound to a sub-path (data.*) keeps showing
        // stale data. The old condition `path.startsWith(changedPath + ".")` collapsed
        // to startsWith(".") when changedPath === "" — false for every real path — so
        // root replacements silently notified nobody but the root listener.
        //
        // Potentially expensive with many listeners; optimize with a Trie if needed.
        for (const path of this.listeners.keys()) {
            // For a root replacement, every non-root path is a descendant.
            // For a sub-path change, only listeners under that path qualify.
            const isDescendant = changedPath === ""
                ? path !== ""
                : path.startsWith(changedPath + ".") && path !== changedPath;
            if (isDescendant) {
                this.notifyListenersForPath(path);
            }
        }
    }

    notifyListenersForPath(path) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).forEach(cb => cb());
        }
    }

    /**
     * Updates the given data object immutably.
     * Adapted from ReactiveJsonRoot.updateDataObject but modified for immutability.
     */
    updateDataObject(dataWrapper, path, value, updateMode = undefined) {
        return this._immutableUpdate(dataWrapper, path, value, updateMode);
    }

    _immutableUpdate(dataWrapper, path, value, updateMode) {
        const root = dataWrapper.realCurrentData;
        const splitPath = path.split(".");

        // Helper to clone a node
        const clone = (obj) => {
            if (Array.isArray(obj)) return [...obj];
            if (typeof obj === "object" && obj !== null) return { ...obj };
            return {};
        };

        const updateNode = (node, keyIndex) => {
            // Handle root update logic or deep update
            const key = splitPath[keyIndex];
            const isLast = keyIndex === splitPath.length - 1;

            // Handle missing intermediate nodes
            if ((node === undefined || node === null) && !isLast) {
                // Determine if we should create an array or an object based on the next key
                // If next key is an integer, we might assume array, but for now object is safer default
                // unless we know the schema.
                // However, reactive-json generally uses objects unless arrays are explicit.
                // But wait, if we are at "rows" (array) and adding to it...
                node = {}; 
            }

            // Clone current node to ensure immutability
            // If node is undefined (at root or leaf), default to object or array?
            // If it's the root and undefined, it should have been handled before.
            const newNode = (node === undefined) ? {} : clone(node);

            if (isLast) {
                // Perform the update logic on the cloned node
                if (updateMode === "remove" && Array.isArray(newNode)) {
                    newNode.splice(key, 1);
                } else if (updateMode === "move") {
                    // ... existing move logic ...
                    if (value.increment) {
                        if (!Array.isArray(newNode)) return newNode;
                        const idx = parseInt(key);
                        const newIndex = Math.min(
                            newNode.length,
                            Math.max(0, idx + parseInt(value.increment))
                        );
                        if (newIndex === idx) return newNode;
                        
                        const itemToMove = newNode.splice(idx, 1);
                        if (itemToMove.length < 1) return newNode;
                        
                        newNode.splice(newIndex, 0, itemToMove[0]);
                    }
                } else {
                    if (value === undefined) {
                        delete newNode[key];
                    } else if (isEqual(value, newNode[key])) {
                        return newNode;
                    } else {
                        if (updateMode === "add") {
                            // "add" usually implies pushing to an array.
                            // The path points to the ARRAY itself, so 'key' is the array property name.
                            // e.g. path="rows", key="rows". newNode is the parent of "rows".
                            
                            // WAIT. splitPath logic:
                            // path="rows". splitPath=["rows"].
                            // updateNode(root, 0). key="rows". isLast=true.
                            // newNode is clone(root).
                            // newNode["rows"] is the target array.
                            
                            if (newNode[key] === undefined) {
                                newNode[key] = [];
                            } else if (Array.isArray(newNode[key])) {
                                newNode[key] = [...newNode[key]];
                            } else {
                                // Convert to array if it wasn't? Or just overwrite?
                                // If "add" is used on a non-array, it might be intended to create an array.
                                newNode[key] = [newNode[key]]; 
                            }
                            newNode[key].push(value);
                        } else {
                            newNode[key] = value;
                        }
                    }
                }
                return newNode;
            }

            // Recurse down
            newNode[key] = updateNode(node[key], keyIndex + 1);
            return newNode;
        };

        const finalRoot = updateNode(root, 0);
        return { realCurrentData: finalRoot };
    }
}
