import { useStore } from "./StoreContext.jsx";
import { useEffect, useState, useRef } from "react";
import { isEqual } from "lodash";

/**
 * Hook to consume reactive data from the store.
 * 
 * @param {string} path Dot-separated path to the data.
 * @returns {*} The value at the path.
 */
export const useReactiveData = (path) => {
    const store = useStore();
    
    // Initialize state with current value from store.
    const [value, setValue] = useState(() => store.get(path));
    
    // Keep track of the current value in a ref to use inside the callback
    const valueRef = useRef(value);

    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        // The callback function that runs when store notifies update.
        const handleChange = () => {
            const newValue = store.get(path);
            
            // Only update state if value actually changed deeply.
            if (!isEqual(newValue, valueRef.current)) {
                setValue(newValue);
            }
        };

        // Subscribe.
        const unsubscribe = store.subscribe(path, handleChange);
        
        // Check once on mount/path change
        handleChange();

        return unsubscribe;
    }, [path, store]);

    return value;
};
