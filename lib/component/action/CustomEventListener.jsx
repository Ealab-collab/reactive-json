import { useContext, useEffect } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";
import { replaceEventPlaceholders } from "../../engine/index.js";

/**
 * Listens to custom events on DOM elements and executes a reaction function in response.
 *
 * CustomEventListener listens directly on the target element
 * specified by the attributesHolderRef.
 *
 * @param {{}} props
 * @returns {JSX.Element}
 * @constructor
 */
export const CustomEventListener = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const elementRef = props.attributesHolderRef;

    // Get available reactions from merged plugins.
    const plugins = globalDataContext.plugins ?? {};
    const reactionFunctions = plugins?.reaction ?? {};

    const actionProps = props?.actionProps ?? undefined;

    useEffect(() => {
        const payload = actionProps ?? undefined;
        const functionToCall = actionProps?.what ?? undefined;

        const listener = (event) => {
            const toCall = functionToCall && (reactionFunctions[functionToCall] ?? undefined);

            if (toCall) {
                const preparedArgs = replaceEventPlaceholders(payload, event);
                toCall({ args: preparedArgs, event, globalDataContext, templateContext });
            }
        };

        // We listen on the element that triggered the request
        // because the custom events are dispatched on the element that triggered the request.
        const elementToListen = elementRef.current;
        
        if (elementToListen) {
            elementToListen.addEventListener(actionProps.on, listener);
            
            return () => {
                elementToListen.removeEventListener(actionProps.on, listener);
            };
        }
    }, [globalDataContext, actionProps, templateContext]);

    return props.children;
};
