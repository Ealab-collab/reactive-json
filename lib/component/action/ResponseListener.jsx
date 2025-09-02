import { useContext, useEffect } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";
import { replaceEventPlaceholders } from "../../engine/index.js";

/**
 * Listens to "response" custom events on DOM elements and executes a reaction function in response.
 * This component is used to handle responses from fetchData and similar HTTP reactions.
 *
 * Unlike MessageListener and HashChangeListener which listen on the window object,
 * ResponseListener listens directly on the target element where the reaction was defined.
 *
 * @param {{}} props
 * @returns {JSX.Element}
 * @constructor
 */
export const ResponseListener = (props) => {
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
            elementToListen.addEventListener("response", listener);
            
            return () => {
                elementToListen.removeEventListener("response", listener);
            };
        }
    }, [globalDataContext, actionProps, templateContext]);

    return props.children;
};
