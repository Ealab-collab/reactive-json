import {createContext} from "react";

/**
 * A context for "globalizing" event dispatchers.
 *
 * This will help reducing the count of event listeners added to the DOM,
 * which would slow down the render if each listener was appended individually.
 */
export const EventDispatcherContext = createContext({
    addEventListener: null,
    removeEventListener: null,
});
