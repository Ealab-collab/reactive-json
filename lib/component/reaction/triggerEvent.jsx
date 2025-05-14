/**
 * Reaction function which will trigger an event on an element identified by the given selector.
 *
 * @param {{args:{selector, selectorBase, eventName}, event}} props Reaction function props.
 */
export const triggerEvent = (props) => {
    const selector = props?.args?.selector;

    if (!selector || typeof selector !== "string" || selector.length === 0) {
        return;
    }

    const selectorBase = props?.args?.selectorBase;
    let selectorBase_real;

    if (typeof selectorBase === "undefined") {
        selectorBase_real = document;
    } else if (selectorBase === "currentEventTarget") {
        selectorBase_real = props?.event?.target;
    } else {
        // Find the closest element matching the selectorBase as selector.
        selectorBase_real = props?.event?.target?.closest(selectorBase);
    }

    if (!selectorBase_real) {
        return;
    }

    const eventName = props?.args?.eventName;

    if (!eventName || typeof eventName !== "string" || eventName.length === 0) {
        return;
    }

    const elements = selectorBase_real.querySelectorAll(selector);

    // Prepare the events in a promise system to handle successive synchronous events.
    // If not doing this, only the last synchronous event will fire.
    const elements_asArray = Object.entries(elements);

    const consumeSingleEvent = () => {
        const element = elements_asArray.splice(0, 1)?.[0]?.[1] ?? undefined;

        if (!element) {
            return;
        }

        const event = new Event(eventName, {
            bubbles: true,
            cancelable: false,
        });

        element.dispatchEvent(event);

        // We use promises to make multiple clicks on different targets work.
        // Without this, only the last will receive the event (tested on Firefox).
        // This is undocumented online.
        Promise.resolve().then(consumeSingleEvent);
    };

    consumeSingleEvent();
};
