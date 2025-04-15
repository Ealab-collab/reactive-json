import {memo} from "react";
import EventDispatcherContext from "./EventDispatcherContext";

/**
 * Contains the registered listeners. It's shared between all the components.
 *
 * @type {{}}
 */
const events = {};

/**
 * The main dispatcher which will really be called by the browser's event system.
 *
 * @param {Event} event The event sent by the browser, which will be transferred to the registered listeners.
 */
const mainDispatcher = (event) => {
    if (!events.hasOwnProperty(event.type)) {
        // Ignore this event.
        return;
    }

    for (const registeredListener of events[event.type]) {
        // Inject the event details into the registered listener.
        registeredListener(event);
    }
};

/**
 * Adds the listener to registered listeners.
 *
 * @param {string} type The event type.
 * @param {Function} listener The event listener.
 */
export const addEventListener = (type, listener) => {
    if (events.hasOwnProperty(type)) {
        events[type].push(listener);
    } else {
        // This is a new event type. Add the event listener.
        window.addEventListener(type, mainDispatcher);

        events[type] = [listener];
    }
};

/**
 * Removes the specified listener.
 *
 * @param {string} type Event type.
 * @param {Function} listener Event listener.
 */
export const removeEventListener = (type, listener) => {
    if (!events.hasOwnProperty(type)) {
        return;
    }

    const index = events[type].indexOf(listener);

    if (index > -1) {
        // Remove once the item.
        events[type].splice(index, 1);
    }
};

/**
 * Use this provider in combination with EventDispatcherContext.
 *
 * @param props
 *
 * @returns {JSX.Element}
 *
 * @constructor
 */
const EventDispatcherProvider = (props) => {
    return <EventDispatcherContext.Provider value={{addEventListener, removeEventListener}}>
        {props.children}
    </EventDispatcherContext.Provider>;
}

// TODO: evaluate if memo is useful here.
export default memo(EventDispatcherProvider);
