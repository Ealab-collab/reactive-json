import {createContext} from "react";

type EventListenerProps = (type: string, listener: () => void) => void;

export type EventDispatcherContextProps = {
    addEventListener: EventListenerProps | null,
    removeEventListener: EventListenerProps | null,
};

/**
 * A context for "globalizing" event dispatchers.
 *
 * This will help reducing the count of event listeners added to the DOM,
 * which would slow down the render if each listener was appended individually.
 */
export const EventDispatcherContext = createContext<EventDispatcherContextProps>({
    addEventListener: null,
    removeEventListener: null,
});
