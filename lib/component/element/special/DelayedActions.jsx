import ActionDependant, {isValid} from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import View from "../../../engine/View";
import {reactionFunctions} from "../../action/ReactOnEvent";
import {useContext, useEffect} from "react";

/**
 * Provides a way to execute actions after a delay, at intervals, etc.
 *
 * @param {{}} props Build data.
 * @param currentData Current data.
 * @param path Element path.
 *
 * @constructor
 */
const DelayedActions = ({props, currentData, path}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const delayedActions = Array.isArray(props.delayedActions) ? props.delayedActions : [];
    const templateContexts = {globalDataContext, templateContext};

    useEffect(() => {
        if (!props.interval) {
            return;
        }

        const interval = setInterval(() => {
            const reactionFunctionsToExecute = getReactionFunctionsToExecute(delayedActions, templateContexts);

            // Execute the reaction functions.
            // They are supposed to be validated for execution by getReactionFunctionsToExecute.
            // The events (on change, on click, etc.) are ignored because
            // it does not make sense to have to wait for a delay AND a specific event.
            // The time is already an event.
            for (let reactionFunctionPropsIndex = 0; reactionFunctionPropsIndex < reactionFunctionsToExecute.length; ++reactionFunctionPropsIndex) {
                const singleReactionFunctionProps = reactionFunctionsToExecute[reactionFunctionPropsIndex];

                if (!singleReactionFunctionProps) {
                    // Empty definition.
                    continue;
                }

                const reactionFunction = singleReactionFunctionProps.what && (reactionFunctions[singleReactionFunctionProps.what] ?? null);

                if (!reactionFunction) {
                    continue;
                }

                // Call the reaction function with the props and context data.
                // This differs from the ReactOnEvent implementation by not including event data,
                // because we did not trigger an event.
                reactionFunction({args: singleReactionFunctionProps, globalDataContext, templateContext});
            }

            if (props.once) {
                clearInterval(interval);
            }
        }, props.interval);

        return () => clearInterval(interval);
    }, [globalDataContext, templateContext]);

    return <ActionDependant {...props}>
        {props.content && <View
            props={props.content}
            currentData={currentData?.content ?? undefined}
            datafield={"content"}
            path={path + ".content"}/>}
    </ActionDependant>;
};


/**
 * Gets the reaction functions to execute.
 *
 * This is a specific adaptation of getActionsToExecute from the Actions core functionality.
 *
 * @param {Array} actions
 * @param {object} templateContexts
 * @returns {*[]} The list of reaction function properties. The structure is simpler than getActionsToExecute.
 */
export const getReactionFunctionsToExecute = (actions, templateContexts) => {
    const result = [];

    if (!Array.isArray(actions)) {
        // Not a supported actions structure.
        // Dev note: we may also allow objects in the future, to allow specific overrides.
        return result;
    }

    for (const [, item] of actions.entries()) {
        const what = item?.what ?? undefined;

        if (!what) {
            continue;
        }

        const reactionFunction = reactionFunctions[what] ?? undefined;

        if (!reactionFunction) {
            // The component is unknown or not registered,
            // and it's not a reaction function.
            continue;
        }

        // This is a reaction function.
        if (!isValid(item, templateContexts)) {
            continue;
        }

        result.push(item);
    }

    return result;
};

export default DelayedActions;
