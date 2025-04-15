import {useContext, useEffect} from "react";
import {reactionFunctions} from "./ReactOnEvent";
import EventDispatcherContext from "../../engine/EventDispatcherContext";
import GlobalDataContext from "../../engine/GlobalDataContext";
import TemplateContext from "../../engine/TemplateContext";
import {evaluateTemplateValueCollection} from "../../engine/TemplateSystem";
import {isEqual} from "lodash";

/**
 * Listens to messages on the window object and executes a reaction function in response.
 *
 * @param {{}} props
 * @returns {JSX.Element}
 * @constructor
 */
const MessageListener = (props) => {
    const eventDispatcherContext = useContext(EventDispatcherContext);
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const actionProps = props?.actionProps ?? undefined;

    useEffect(() => {
        const payload = actionProps ?? undefined;
        const functionToCall = actionProps?.what ?? undefined;
        const whenMessageIs = actionProps?.whenMessageIs ?? undefined;

        const whenMessageIs_evaluated = evaluateTemplateValueCollection({
            globalDataContext,
            templateContext,
            valueToEvaluate: whenMessageIs
        });

        const listener = (event) => {
            if (event.origin !== window.location.origin) {
                // The message is not allowed because it targets an unknown origin.
                return;
            }

            // The "event.data" is supposed to be already evaluated.
            // Use lodash's isEqual to compare the values properly (deep compare for objects).
            if (!isEqual(event.data, whenMessageIs_evaluated)) {
                return;
            }

            const toCall = functionToCall && (reactionFunctions[functionToCall] ?? undefined);

            toCall && toCall({args: payload, event, globalDataContext, templateContext});
        };

        // Dev note: we use a context to prevent adding too many real event listeners which would slow down the build.
        eventDispatcherContext?.addEventListener("message", listener);

        return () => {
            eventDispatcherContext?.removeEventListener("message", listener);
        };
    }, [eventDispatcherContext, globalDataContext, actionProps, templateContext]);

    return <>{props.children}</>;
};

export default MessageListener;
