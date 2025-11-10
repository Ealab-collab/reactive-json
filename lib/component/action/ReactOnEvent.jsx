import { Children, cloneElement, Fragment, isValidElement, useContext } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { replaceEventPlaceholders } from "../../engine/index.js";
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
                reactionFunction({
                    args: preparedArgs,
                    event,
                    eventData: {
                        // We copy the event data to make them available
                        // to asynchronous reaction functions.
                        // This is needed because React will reset the event object data
                        // to reuse it for other events (see pooling of events in React).
                        currentTarget: event.currentTarget,
                        bubbles: event.bubbles,
                        cancelable: event.cancelable,
                        composed: event.composed,
                        defaultPrevented: event.defaultPrevented,
                        isTrusted: event.isTrusted,
                        target: event.target,
                        timeStamp: event.timeStamp,
                        type: event.type,
                    },
                    globalDataContext,
                    templateContext
                });

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
    // Note that this technique can only work on standard events;
    // for custom events, we use the CustomEventListener component.
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
