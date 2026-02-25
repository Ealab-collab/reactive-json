import { createContext, useContext, useEffect, useRef } from "react";
import { DataStore } from "./DataStore.js";

export const StoreContext = createContext(null);

export const StoreProvider = ({ children, initialData }) => {
    // Create the store once.
    const store = useRef(new DataStore(initialData)).current;
    
    return (
        <StoreContext.Provider value={store}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const store = useContext(StoreContext);
    if (!store) {
        throw new Error("useStore must be used within a StoreProvider");
    }
    return store;
};
