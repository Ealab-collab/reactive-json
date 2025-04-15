import {useContext} from "react";
import GlobalDataContext from "./GlobalDataContext";
import TemplateContext from "./TemplateContext";
import {evaluateTemplateValue, isTemplateValue} from "./TemplateSystem";

import HashChangeListener from "../component/action/HashChangeListener";
import Hide from "../component/action/Hide";
import MessageListener from "../component/action/MessageListener";
import Popover from "../component/action/Popover";
import ReactOnEvent, {reactionFunctions} from "../component/action/ReactOnEvent";
import Redirect from "../component/action/Redirect";
import Tooltip from "../component/action/Tooltip";
import VisuallyHide from "../component/action/VisuallyHide";
import {isEqual} from "lodash";
import JSONPath from "jsonpath";

/**
 * Contains the list of available actions in config.
 * @type {{}}
 */
const actionsToEvaluate = {
    hide: Hide,
    popover: Popover,
    redirect: Redirect,
    tooltip: Tooltip,
    visuallyHide: VisuallyHide,
};

/**
 * Capitalizes the first letter.
 *
 * @param str
 * @returns {string}
 */
const capitalizeFirstLetter = (str) => str && str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Checks whether the conditions are fulfilled.
 * @param {{andConditions, containedBy, containedByNot, contains, containsNot, is, isNot, orConditions, when, whenDataCountOf, ">", "<", ">=", "<=", compareAsDates}} condition
 * @param {object} templateContexts
 * @param {Map} additionalConditionHandlers
 * @returns {*}
 */
export const isValid = (condition, templateContexts, additionalConditionHandlers) => {
    const {globalDataContext, templateContext} = templateContexts;

    if (Array.isArray(condition.andConditions)) {
        return condition.andConditions.reduce(
            (acc, cur) => {
                // All sub conditions must be true.
                return acc && isValid(cur, templateContexts, additionalConditionHandlers);
            },
            true
        );
    }

    if (Array.isArray(condition.orConditions)) {
        const orConditions = condition.orConditions;

        for (const condition of orConditions) {
            if (isValid(condition, templateContexts, additionalConditionHandlers)) {
                // A single condition is enough to validate.
                return true;
            }
        }

        return false;
    }

    if (condition.when !== undefined && !isTemplateValue(condition.when)) {
        return false;
    }

    const evaluateTemplateValueLocal = (toEvaluate) => {
        return evaluateTemplateValue({
            globalDataContext: globalDataContext,
            templateContext: templateContext,
            valueToEvaluate: toEvaluate,
        });
    }

    let valueToCompare;

    if (condition.when === undefined && condition.hasOwnProperty("whenDataCountOf")) {
        // Select where to count.
        let countFinalTemplateData;

        switch (condition.inContext) {
            case "root":
                countFinalTemplateData = globalDataContext.getRootContext().templateData;
                break;

            case "template":
                countFinalTemplateData = templateContext.templateData;
                break;

            default:
                countFinalTemplateData = globalDataContext.templateData;
                break;
        }

        valueToCompare = JSONPath.query(countFinalTemplateData, condition.whenDataCountOf).length;
    } else {
        // Other code may inject additional condition handler which can return the value to compare.
        valueToCompare = (() => {
            if (additionalConditionHandlers) {
                for (const [handlerId, additionalConditionHandler] of additionalConditionHandlers) {
                    if (condition.hasOwnProperty(handlerId)) {
                        // This additional condition handler will compute the value to compare.
                        return additionalConditionHandler({
                            condition,
                            templateContexts,
                            evaluateAgainstTemplates: (value) => {
                                return evaluateTemplateValueLocal(value);
                            }
                        });
                    }
                }
            }

            // Compute using the usual method.
            return evaluateTemplateValueLocal(condition.when);
        })();
    }

    if (condition.hasOwnProperty("isEmpty")) {
        const maybeInvert = val => condition.isEmpty === "not" ? !val : val;

        if (valueToCompare === null) {
            return maybeInvert(true);
        }

        switch (typeof valueToCompare) {
            case "undefined":
                return maybeInvert(true);

            case "string":
                return maybeInvert(valueToCompare.length === 0);

            case "object":
                return maybeInvert(Object.keys(valueToCompare).length === 0);

            default:
                return maybeInvert(!valueToCompare);
        }
    }

    // This can be useful when two differently formatted dates must be compared.
    const compareAsDates = condition.compareAsDates;

    if (condition.hasOwnProperty("isNot")) {
        return maybeDate(compareAsDates, valueToCompare) !== maybeDate(compareAsDates, evaluateTemplateValueLocal(condition.isNot));
    }

    if (condition.hasOwnProperty("is")) {
        return maybeDate(compareAsDates, valueToCompare) === maybeDate(compareAsDates, evaluateTemplateValueLocal(condition.is));
    }

    if (condition.hasOwnProperty("containsNot") || condition.hasOwnProperty("contains")) {
        // True if containsNot.
        const invertedMode = condition.hasOwnProperty("containsNot");

        const needleSource = invertedMode ? condition.containsNot : condition.contains;

        const needle = maybeDate(compareAsDates, evaluateTemplateValueLocal(needleSource));

        if (typeof valueToCompare === "string") {
            // Check as a string. Do a case-insensitive check.
            if (typeof needle !== "string") {
                // The types do not match.
                return invertedMode;
            }

            const result = valueToCompare.toLowerCase().indexOf(needle.toLowerCase()) !== -1;

            return invertedMode ? !result : result;
        } else {
            for (const item of Object.values(valueToCompare)) {
                if (isEqual(maybeDate(compareAsDates, item), needle)) {
                    // The needle has been found. When in inverted mode (containsNot), return false.
                    return !invertedMode;
                }
            }
        }

        // The needle has not been found. When in inverted mode (containsNot), return true.
        return invertedMode;
    }

    if (condition.hasOwnProperty("containedByNot") || condition.hasOwnProperty("containedBy")) {
        // True if containedByNot.
        const invertedMode = condition.hasOwnProperty("containedByNot");

        const needleSource = invertedMode ? condition.containedByNot : condition.containedBy;

        const container = maybeDate(compareAsDates, evaluateTemplateValueLocal(needleSource));

        if (typeof valueToCompare === "string") {
            // Check as a string. Do a case-insensitive check.
            if (typeof container !== "string") {
                // The types do not match.
                return invertedMode;
            }

            const result = container.toLowerCase().indexOf(valueToCompare.toLowerCase()) !== -1;

            return invertedMode ? !result : result;
        } else {
            for (const item of Object.values(container)) {
                if (isEqual(maybeDate(compareAsDates, item), valueToCompare)) {
                    // The needle has been found. When in inverted mode (containsNot), return false.
                    return !invertedMode;
                }
            }
        }

        // The needle has not been found. When in inverted mode (containsNot), return true.
        return invertedMode;
    }

    if (condition.hasOwnProperty(">")) {
        return maybeDate(compareAsDates, valueToCompare) > maybeDate(compareAsDates, evaluateTemplateValueLocal(condition[">"]));
    }

    if (condition.hasOwnProperty(">=")) {
        return maybeDate(compareAsDates, valueToCompare) >= maybeDate(compareAsDates, evaluateTemplateValueLocal(condition[">="]));
    }

    if (condition.hasOwnProperty("<")) {
        return maybeDate(compareAsDates, valueToCompare) < maybeDate(compareAsDates, evaluateTemplateValueLocal(condition["<"]));
    }

    if (condition.hasOwnProperty("<=")) {
        return maybeDate(compareAsDates, valueToCompare) <= maybeDate(compareAsDates, evaluateTemplateValueLocal(condition["<="]));
    }

    // No condition means always valid.
    return true;
};

/**
 * Gets the actions to execute for the current component.
 * @param {Array} actions
 * @param {object} templateContexts
 * @returns {*[]}
 */
const getActionsToExecute = (actions, templateContexts) => {
    const result = [];

    let requiresReactionComponent = false;

    const reactionFunctionProps = {};

    if (!Array.isArray(actions)) {
        // Not a supported actions structure.
        // Dev note: we may also allow objects in the future, to allow specific overrides.
        return result;
    }

    // The index is useful to build the data path for the components created by the actions.
    // This is a requirement of the View components.
    // Dev note: could it be like the components, where we can specify string keys,
    // thus allowing objects in the actions definitions?
    for (const [index, item] of actions.entries()) {
        const what = item?.what ?? undefined;

        if (!what) {
            continue;
        }

        const Component = actionsToEvaluate[what];
        let reactionFunction = undefined;

        if (!Component) {
            // This is not a component. Maybe it's a reaction function...
            reactionFunction = reactionFunctions[what] ?? undefined;

            if (!reactionFunction) {
                // The component is unknown or not registered,
                // and it's not a reaction function.
                continue;
            }

            // This is a reaction function.
            if (item.on === undefined) {
                // Reaction functions are called only in response to events.
                // Dev note: evaluate if we can execute reaction functions on component mount,
                // with empty "on".
                continue;
            }

            if (!isValid(item, templateContexts)) {
                continue;
            }

            if (item.on === "message") {
                // "message" has a special handling. It adds the special MessageListener action component.
                // This is because the message event can only be listened to on the window object,
                // so it adds event listeners on the window object (not the current component).
                result.push({ActionComponent: MessageListener, actionProps: item, actionIndex: index});
                continue;
            }

            if (item.on === "hashchange") {
                // "hashchange" works in the same way than "message": it must be added on the window object.
                result.push({ActionComponent: HashChangeListener, actionProps: item, actionIndex: index});
                continue;
            }

            requiresReactionComponent = true;

            const normalizedEventName = "on" + capitalizeFirstLetter(item.on);

            if (!Array.isArray(reactionFunctionProps[normalizedEventName])) {
                // Initialize the key.
                reactionFunctionProps[normalizedEventName] = [];
            }

            // Append the reaction function definition that will be read
            // later by the ReactOnEvent action component.
            reactionFunctionProps[normalizedEventName].push(item);

            // Do not add the ReactOnEvent component yet in the result array.
            // It will be added at the end of the actions chain.
            continue;
        }

        if (!isValid(item, templateContexts)) {
            continue;
        }

        result.push({ActionComponent: Component, actionProps: item, actionIndex: index});
    }

    if (requiresReactionComponent) {
        // Add the final component for reaction.
        // It's added at the end because it will collect all definitions
        // and apply the reaction function properties on the real rendered element.
        // TODO: evaluate if the _reactOnEvent actionIndex may create issues.
        result.push({ActionComponent: ReactOnEvent, actionProps: reactionFunctionProps, actionIndex: "_reactOnEvent"});
    }

    return result;
};

/**
 * Maybe converts the given value to a date representation.
 *
 * Needed for date comparisons.
 *
 * @param {boolean} shouldCompareAsDates Tells if the value should be converted.
 * @param {any} a The value to maybe convert.
 *
 * @returns {Date|*} The converted or same value.
 */
const maybeDate = (shouldCompareAsDates, a) => {
    return shouldCompareAsDates ? new Date(a) : a;
};

/**
 * Component that executes actions before rendering its children.
 *
 * Actions include a system to hide.
 *
 * @param props The props that served to build an action dependant component.
 * @returns {*}
 * @constructor
 */
const ActionDependant = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    if (!props) {
        // There is nothing to render or evaluate, so don't even bother checking the actions.
        return null;
    }

    const result = getActionsToExecute(props?.actions ?? [], {globalDataContext, templateContext});

    // Encapsulate into actions.
    return result.reverse().reduce((acc, {ActionComponent, actionProps, actionIndex}) => {
        // actionProps contains only the info that is related to the action.
        return <ActionComponent
            componentProps={props}
            actionProps={actionProps}
            actionIndex={actionIndex}>
            {acc}
        </ActionComponent>;
    }, props?.children ?? null);
};

export default ActionDependant;
