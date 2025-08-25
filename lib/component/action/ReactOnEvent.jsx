import { Children, cloneElement, Fragment, isValidElement, useContext } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";

/**
 * Action component which will append one or more event listeners on the element.
 *
 * @param {Object} props
 *
 * @constructor
 */
export const ReactOnEvent = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    // Get available reactions from merged plugins.
    const plugins = globalDataContext.plugins ?? {};
    const reactionFunctions = plugins?.reaction ?? {};

    const { actionProps: reactionFunctionProps } = props;

    // Event attributes to inject.
    const eventPropsForAttributes = {};

    // ---------------------------------------------------------------------------
    //  Event placeholders reference system
    // ---------------------------------------------------------------------------
    //  1)  <reactive-json:event-new-value>
    //      Returns the « new value » of a standard form event.
    //      Priority :
    //          a) event.target.checked
    //          b) event.target.value
    //          c) undefined if not applicable
    //      → Prefer for change/input on TextField, CheckBoxField, SelectField, etc.
    //
    //  2)  <reactive-json:event>.some.path
    //      Explicit access to any property of the event object:
    //          • .data.*   for MessageEvent
    //          • .detail.* for CustomEvent
    //          • .key      for KeyboardEvent, etc.
    //      If no path is provided (empty placeholder), return undefined
    //      to avoid injecting the Event object into the data store.
    // ---------------------------------------------------------------------------

    const EVENT_PLACEHOLDER_PREFIX = "<reactive-json:event>";
    const EVENT_NEW_VALUE_PLACEHOLDER = "<reactive-json:event-new-value>";

    // Derive the most relevant "new value" from the event.
    const extractEventNewValue = (event) => {
        if (!event) return undefined;

        // Priority: derive the most relevant "new value" depending on the field type.
        if (event.target) {
            const t = event.target;

            // Special case: checkbox → return the boolean "checked".
            if (t.type === "checkbox") {
                return t.checked;
            }

            // Special case: radio → return the value only if selected.
            if (t.type === "radio") {
                return t.checked ? t.value : undefined;
            }

            // Text field / number / select, etc. → return the value.
            if (typeof t.value !== "undefined") {
                return t.value;
            }

            // Fallback: return checked if it exists.
            if (typeof t.checked !== "undefined") {
                return t.checked;
            }
        }

        // No applicable property found.
        return undefined;
    };

    /**
     * Resolves a placeholder string against the event object.
     *
     * @param {*} value The value to inspect. If it's a string beginning with the placeholder prefix, it will be replaced.
     * @param {Event} event The DOM or custom event object that triggered the action.
     * @returns {*} The original value or the resolved value extracted from the event.
     */
    const evaluateEventPlaceholder = (value, event) => {
        // Special constant shortcut
        if (value === EVENT_NEW_VALUE_PLACEHOLDER) {
            return extractEventNewValue(event);
        }

        if (typeof value !== "string" || !value.startsWith(EVENT_PLACEHOLDER_PREFIX)) {
            return value;
        }

        // Extract the path after the prefix.
        let path = value.slice(EVENT_PLACEHOLDER_PREFIX.length);

        // Remove an optional leading dot.
        if (path.startsWith(".")) {
            path = path.slice(1);
        }

        if (!path) {
            // For security, we don't return the raw event
            // object to avoid storing it in the data.
            return undefined;
        }

        return path.split(".").reduce((current, key) => (current ? current[key] : undefined), event);
    };

    /**
     * Recursively scans an object/array/string to replace any event placeholder it may contain.
     *
     * @param {*} source The source value (object, array, or primitive).
     * @param {Event} event The event to read values from.
     * @returns {*} A new structure with placeholders resolved.
     */
    const replaceEventPlaceholders = (source, event) => {
        if (Array.isArray(source)) {
            return source.map((item) => replaceEventPlaceholders(item, event));
        }

        if (source && typeof source === "object") {
            const replaced = {};
            for (const [key, val] of Object.entries(source)) {
                replaced[key] = replaceEventPlaceholders(val, event);
            }
            return replaced;
        }

        // Primitive values (string/number/etc.)
        return evaluateEventPlaceholder(source, event);
    };

    for (const [eventName, eventReactionFunctionProps] of Object.entries(reactionFunctionProps)) {
        // Prepare the callback.
        // There will be 1 callback per eventName.
        // Each callback will have a list of objects, each object representing 1 reaction function call.
        eventPropsForAttributes[eventName] = (event) => {
            let lastStopPropagation = true;

            for (const singleReactionFunctionProps of eventReactionFunctionProps) {
                // singleReactionFunctionProps is the object containing info from the data structure.
                if (!singleReactionFunctionProps) {
                    continue;
                }

                const reactionFunction =
                    singleReactionFunctionProps.what && (reactionFunctions[singleReactionFunctionProps.what] ?? null);

                if (!reactionFunction) {
                    continue;
                }

                // Replace any <reactive-json:event> placeholders before executing the reaction.
                const preparedArgs = replaceEventPlaceholders(singleReactionFunctionProps, event);

                // Call the reaction function with the props, the event details, and context data.
                reactionFunction({ args: preparedArgs, event, globalDataContext, templateContext });

                if (preparedArgs.stopPropagation === true) {
                    // Stop executing reaction functions of this event early.
                    break;
                }

                lastStopPropagation = preparedArgs.stopPropagation ?? true;
            }

            if (lastStopPropagation !== false) {
                // Stop propagation unless "stopPropagation" is explicitly set on false.
                // Stopping the propagation is the default behavior.
                event.stopPropagation();
            }
        };
    }

    // Recreate the component with the event attributes.
    // The recursive map is required because the item can be nested into a React.Fragment,
    // and we want to add the attributes on the "real" element.
    const recursiveMap = (children) => {
        if (!children) {
            return children;
        }

        const childrenArray = Children.toArray(children);

        return Children.map(childrenArray, (child) => {
            if (child.type === Fragment) {
                // Dig deeper.
                return recursiveMap(child?.props?.children);
            }

            if (typeof child !== "object" || !isValidElement(child)) {
                // Not a React element that can welcome attributes.
                return child;
            }

            // Clone the element and append the attributes.
            return cloneElement(child, eventPropsForAttributes);
        });
    };

    const clonedChild = recursiveMap(props.children);

    return <>{clonedChild}</>;
};
