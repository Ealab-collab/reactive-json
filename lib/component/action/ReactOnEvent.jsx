import {Children, cloneElement, Fragment, isValidElement, useContext} from "react";
import GlobalDataContext from "../../engine/GlobalDataContext";
import TemplateContext from "../../engine/TemplateContext";
import {addData} from "../reaction/addData";
import {fetchData} from "../reaction/fetchData";
import {moveData} from "../reaction/moveData";
import {postMessage} from "../reaction/postMessage";
import {redirectNow} from "../reaction/redirectNow";
import {removeData} from "../reaction/removeData";
import {setData} from "../reaction/setData";
import {submitData} from "../reaction/submitData";
import {triggerEvent} from "../reaction/triggerEvent";
import {setClipboardData} from "../reaction/setClipboardData";

/**
 * Functions that will be executed on specific events.
 *
 * @type {{}}
 */
export const reactionFunctions = {
    addData,
    fetchData,
    moveData,
    postMessage,
    redirectNow,
    removeData,
    setClipboardData,
    setData,
    submitData,
    triggerEvent,
};

/**
 * Action component which will append one or more event listeners on the element.
 *
 * @param {Object} props
 *
 * @constructor
 */
const ReactOnEvent = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const {actionProps: reactionFunctionProps} = props;

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

                const reactionFunction = singleReactionFunctionProps.what && (reactionFunctions[singleReactionFunctionProps.what] ?? null);

                if (!reactionFunction) {
                    continue;
                }

                // Call the reaction function with the props, the event details, and context data.
                reactionFunction({args: singleReactionFunctionProps, event, globalDataContext, templateContext});

                if (singleReactionFunctionProps.stopPropagation === true) {
                    // Stop executing reaction functions of this event early.
                    break;
                }

                lastStopPropagation = singleReactionFunctionProps.stopPropagation ?? true;
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

        return Children.map(childrenArray, child => {
            if (child.type === Fragment) {
                // Dig deeper.
                return recursiveMap(child?.props?.children);
            }

            if (typeof child !== 'object' || !isValidElement(child)) {
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

export default ReactOnEvent;
