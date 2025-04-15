import {useContext, useEffect} from "react";
import {reactionFunctions} from "./ReactOnEvent";
import EventDispatcherContext from "../../engine/EventDispatcherContext";
import GlobalDataContext from "../../engine/GlobalDataContext";
import TemplateContext from "../../engine/TemplateContext";
import {evaluateTemplateValueCollection} from "../../engine/TemplateSystem";

/**
 * Listens to hash changes (URL fragment) on the window object and executes a reaction function in response.
 *
 * @param {{}} props
 * @returns {JSX.Element}
 * @constructor
 */
const HashChangeListener = (props) => {
    const eventDispatcherContext = useContext(EventDispatcherContext);
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const actionProps = props?.actionProps ?? undefined;

    useEffect(() => {
        const payload = actionProps ?? undefined;
        const functionToCall = actionProps?.what ?? undefined;
        const whenHashIs = actionProps?.whenHashIs ?? undefined;
        const whenHashWas = actionProps?.whenHashWas ?? undefined;

        const whenHashIs_evaluated = evaluateTemplateValueCollection({
            globalDataContext,
            templateContext,
            valueToEvaluate: whenHashIs
        });

        const whenHashWas_evaluated = evaluateTemplateValueCollection({
            globalDataContext,
            templateContext,
            valueToEvaluate: whenHashWas
        });

        const listener = (event) => {
            // The hash contains the '#' character.
            if (typeof whenHashIs_evaluated === "string" && ((new URL(event.newUrl)).hash !== whenHashIs_evaluated)) {
                return;
            }

            if (typeof whenHashWas_evaluated === "string" && ((new URL(event.oldUrl)).hash !== whenHashIs_evaluated)) {
                return;
            }

            const toCall = functionToCall && (reactionFunctions[functionToCall] ?? undefined);

            toCall && toCall({args: payload, event, globalDataContext, templateContext});
        };

        // Dev note: we use a context to prevent adding too many real event listeners which would slow down the build.
        eventDispatcherContext?.addEventListener("hashchange", listener);

        return () => {
            eventDispatcherContext?.removeEventListener("hashchange", listener);
        };
    }, [eventDispatcherContext, globalDataContext, actionProps, templateContext]);

    return <>{props.children}</>;
};

export default HashChangeListener;
