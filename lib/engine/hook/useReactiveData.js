import { useStore } from "../StoreContext.jsx";
import { useSyncExternalStore, useCallback } from "react";

const normalizePath = (p) => {
    if (!p) return "";
    if (p === "data") return "";
    if (p.startsWith("data.")) return p.substring(5);
    return p;
};

/**
 * Hook to consume reactive data from the store.
 * 
 * @param {string} path Dot-separated path to the data.
 * @returns {*} The value at the path.
 */
export const useReactiveData = (path) => {
    const store = useStore();
    const normalizedPath = normalizePath(path);
    
    const subscribe = useCallback((callback) => {
        return store.subscribe(normalizedPath, callback);
    }, [normalizedPath, store]);

    const getSnapshot = useCallback(() => {
        return store.get(normalizedPath);
    }, [normalizedPath, store]);

    return useSyncExternalStore(subscribe, getSnapshot);
};
