import { useContext } from "react";
import { GlobalDataContext } from "./GlobalDataContext.jsx";
import { TemplateContext } from "./TemplateContext.jsx";
import { normalizeAttributesForReactJsx } from "./utility/reactJsxHelpers.jsx";

/**
 * Transforms a data location string to a path to be used in the UI components.
 *
 * @param dataLocation
 * @param currentPath
 * @param globalDataContext
 * @param templateContext
 * @returns {string|*}
 * @constructor
 * @throws {Error} The path cannot be determined.
 */
export const dataLocationToPath = ({ dataLocation, currentPath, globalDataContext, templateContext }) => {
    if (
        !(typeof dataLocation === "string") ||
        !(
            dataLocation.startsWith("~.") ||
            dataLocation.startsWith("~~.") ||
            dataLocation.startsWith("~>") ||
            dataLocation.startsWith("~~>")
        )
    ) {
        if ("~" === dataLocation) {
            // The data location is the template root.
            return templateContext.templatePath;
        }

        if ("~~" === dataLocation) {
            // The data location is the global template root.
            return globalDataContext.templatePath;
        }

        // This value is not a data location.
        // Render what is given as is.
        return dataLocation;
    }

    // This tells if we check in the current template context, the global data, or the current path.
    let pathBase;

    if (dataLocation.startsWith("~~.")) {
        // Build the path starting from the global data context path (in theory, just "data").
        pathBase = globalDataContext.templatePath;
    } else if (dataLocation.startsWith("~.")) {
        // Build the path starting from the current template path.
        pathBase = templateContext.templatePath;
    } else if (dataLocation.startsWith("~>") || dataLocation.startsWith("~~>")) {
        // Build the path starting from an ascendant of the current template path.
        const prefix = dataLocation.startsWith("~>") ? "~>" : "~~>";

        // First, determine the base key.
        const dotIndex = dataLocation.indexOf(".");
        const baseKeyToFind =
            dotIndex === -1
                ? dataLocation.substring(prefix.length) // "~>key" => "key".
                : dataLocation.substring(prefix.length, dotIndex); // "~>key.prop" => "key".

        if (!templateContext.templatePath.includes(baseKeyToFind)) {
            throw new Error(
                baseKeyToFind +
                    " not found in the current template path. The current template path is: " +
                    templateContext.templatePath
            );
        }

        let baseKeyToFindIndex;

        if (prefix === "~>") {
            // Build the path that starts from the last key found in the current template path.
            baseKeyToFindIndex = templateContext.templatePath.lastIndexOf(baseKeyToFind);
        } else {
            // Build the path that starts from the first key found in the current template path.
            baseKeyToFindIndex = templateContext.templatePath.indexOf(baseKeyToFind);
        }

        pathBase = templateContext.templatePath.substring(0, baseKeyToFindIndex + baseKeyToFind.length);
    } else {
        pathBase = currentPath;
    }

    const locationRemainder = dataLocation.split(".");

    // Remove the template value detection character.
    locationRemainder.shift();

    return locationRemainder.length ? pathBase + "." + locationRemainder.join(".") : pathBase;
};

/**
 * Evaluates the given attributes with the given contexts.
 *
 * @param {{}} attrs
 * @param {{}} globalDataContext
 * @param {{}} templateContext
 * @param {{normalizeBeforeEvaluation : boolean}} options normalizeBeforeEvaluation is false if unset.
 *
 * @returns {{}}
 */
export const evaluateAttributes = ({ attrs, globalDataContext, templateContext, options = {} }) => {
    const evaluated = {};

    if (!attrs) {
        return evaluated;
    }

    const normalized = options.normalizeBeforeEvaluation ? normalizeAttributesForReactJsx(attrs) : attrs;

    for (const attrName of Object.keys(normalized)) {
        // This will replace the value by the template value if it's a valid reference.
        // We call directly the TemplateValue component as a function to evaluate the attribute value.
        const evaluatedAttr = evaluateTemplateValueCollection({
            globalDataContext: globalDataContext,
            templateContext: templateContext,
            valueToEvaluate: normalized[attrName],
        });

        // We only keep the attribute if it can be represented as an attribute value
        // or be interpreted by React such as callbacks.
        if (evaluatedAttr) {
            evaluated[attrName] = evaluatedAttr;
        }

        // TODO: the next code block has been commented out, because we found that
        //  it may be more useful to allow objects as attributes (e.g. the style attribute
        //  which is an object). Remove this block after testing.
        // switch (typeof evaluatedAttr) {
        //     case "string":
        //     case "bigint":
        //     case "number":
        //     case "boolean":
        //     case "function":
        //         evaluated[attrName] = evaluatedAttr;
        //         break;
        //
        //     default:
        //         // We only keep the attribute if it can be represented as an attribute value
        //         // or be interpreted by React such as callbacks.
        //         delete evaluated[attrName];
        //         break;
        // }
    }

    return evaluated;
};

/**
 * Evaluates the template value using the given template and global context.
 *
 * @param valueToEvaluate The value to evaluate.
 * @param globalDataContext The global data context.
 * @param templateContext The template context.
 * @returns {undefined|*}
 */
export const evaluateTemplateValue = ({ valueToEvaluate, globalDataContext, templateContext }) => {
    if (!isTemplateValue(valueToEvaluate)) {
        // This value does not use the template context data.
        // Render what is given as is.
        return valueToEvaluate;
    }

    /*
     * Experimental zone.
     */

    if ("~" === valueToEvaluate) {
        // We want the whole template data.
        return templateContext.templateData;
    } else if ("~~" === valueToEvaluate) {
        // We want the whole global template data.
        return globalDataContext.templateData;
    }

    /*
     * End of experimental zone.
     */

    let currentNode;

    if (valueToEvaluate.startsWith("~~.")) {
        // Start from the global data context node.
        currentNode = globalDataContext?.templateData;
    } else if (valueToEvaluate.startsWith("~>") || valueToEvaluate.startsWith("~~>")) {
        // Special syntax that searches for a location in the current template path.
        // ~> : Searches toward root (lastIndexOf).
        // ~~> : Searches from root (indexOf).
        // The resulting valueToEvaluate is expressed in the global data context.
        // Note: the first part of valueToEvaluate is "data" (e.g. "data.key.prop").
        // This is not a problem because we will remove it later as if it was
        // a template value detection character (e.g. "~", "~~").
        valueToEvaluate = dataLocationToPath({
            dataLocation: valueToEvaluate,
            currentPath: templateContext.templatePath,
            globalDataContext,
            templateContext,
        });

        currentNode = globalDataContext?.templateData;
    } else {
        // Start from the current template context node.
        currentNode = templateContext?.templateData;
    }

    if (!currentNode) {
        // No context supplied. This is likely a bug; contexts must be supplied when calling this function.
        return undefined;
    }

    // Find the value in the template context.
    const splitValueArray = valueToEvaluate.split(".");

    // Remove the template value detection character.
    splitValueArray.shift();

    while (splitValueArray.length) {
        if (typeof currentNode !== "object") {
            // Not an object, so there is no need to continue.
            // Return an undefined value.
            return undefined;
        }

        currentNode = currentNode[splitValueArray.shift()];

        if (currentNode === undefined) {
            // No need to continue.
            // Return an undefined value.
            return undefined;
        }
    }

    return currentNode;
};

/**
 * Evaluates an array or object containing values to evaluate.
 *
 * You can also pass a single value to evaluate.
 *
 * @param {Array|object|*} valueToEvaluate The value to evaluate. Usually a string, an array, or an object.
 * @param {{}} globalDataContext The global data context values.
 * @param {{}} templateContext The current template context values.
 * @param {number} evaluationDepth The depth of evaluation. 0 = no evaluation, 1 = first level only (default), >1 = recursive evaluation, <0 = unlimited recursive evaluation with safety limit.
 *
 * @returns {*} The evaluated value. It tries to keep the same structure (array, object, single) as the given value.
 */
export const evaluateTemplateValueCollection = ({
    valueToEvaluate,
    globalDataContext,
    templateContext,
    evaluationDepth = 1,
}) => {
    // If evaluationDepth is 0, return the value as-is without any evaluation.
    if (evaluationDepth === 0) {
        return valueToEvaluate;
    }

    // Safety limit for unlimited recursion to prevent infinite loops when the evaluationDepth is negative.
    const SAFETY_LIMIT = -20;

    if (evaluationDepth <= SAFETY_LIMIT) {
        // We've reached the safety limit, stop recursion.
        return valueToEvaluate;
    }

    let evaluated;

    if (typeof valueToEvaluate === "object") {
        // Evaluate values at the current level.
        evaluated = Array.isArray(valueToEvaluate) ? [] : {};

        for (const [key, itemContent] of Object.entries(valueToEvaluate)) {
            // First, evaluate the template value at the current level.
            const evaluatedItem = evaluateTemplateValue({
                globalDataContext,
                templateContext,
                valueToEvaluate: itemContent,
            });

            if (
                (evaluationDepth > 1 || evaluationDepth < 0) &&
                typeof evaluatedItem === "object" &&
                evaluatedItem !== null
            ) {
                // We still have depth to evaluate.
                evaluated[key] = evaluateTemplateValueCollection({
                    valueToEvaluate: evaluatedItem,
                    globalDataContext,
                    templateContext,
                    evaluationDepth: evaluationDepth - 1,
                });
            } else {
                evaluated[key] = evaluatedItem;
            }
        }
    } else {
        // Single value.
        evaluated = evaluateTemplateValue({
            globalDataContext,
            templateContext,
            valueToEvaluate,
        });

        if ((evaluationDepth > 1 || evaluationDepth < 0) && typeof evaluated === "object" && evaluated !== null) {
            // The evaluated value may have expanded to an object or an array.
            // Evaluate it again as long as we have depth to evaluate.
            evaluated = evaluateTemplateValueCollection({
                valueToEvaluate: evaluated,
                globalDataContext,
                templateContext,
                evaluationDepth: evaluationDepth - 1,
            });
        }
    }

    return evaluated;
};

/**
 * Checks if the given value is a value which can be replaced by the template system.
 * @param valueToEvaluate
 * @returns {string|boolean}
 */
export const isTemplateValue = (valueToEvaluate) => {
    if (
        !(typeof valueToEvaluate === "string") ||
        !(
            valueToEvaluate.startsWith("~.") ||
            valueToEvaluate.startsWith("~~.") ||
            valueToEvaluate.startsWith("~>") ||
            valueToEvaluate.startsWith("~~>") ||
            "~" === valueToEvaluate ||
            "~~" === valueToEvaluate
        )
    ) {
        // This value does not use the template context data.
        return false;
    }

    // Render what is given as is for chaining.
    return valueToEvaluate;
};

/**
 * A template value is a value that is retrieved from the current template data.
 *
 * @param valueToEvaluate
 *
 * @returns {{}}
 *
 * @constructor
 */
const TemplateValue = ({ valueToEvaluate }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    return evaluateTemplateValue({
        globalDataContext: globalDataContext,
        templateContext: templateContext,
        valueToEvaluate: valueToEvaluate,
    });
};

export default TemplateValue;

/**
 * Evaluates the given attributes with the given contexts.
 *
 * @param {{}} attrs
 * @param {{normalizeBeforeEvaluation : boolean}} options normalizeBeforeEvaluation = true if unset.
 *
 * @returns {{}} Evaluated attributes.
 */
export const useEvaluatedAttributes = (attrs, options = {}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    return evaluateAttributes({
        attrs,
        globalDataContext,
        templateContext,
        options:
            options.normalizeBeforeEvaluation === undefined ? { ...options, normalizeBeforeEvaluation: true } : options,
    });
};
