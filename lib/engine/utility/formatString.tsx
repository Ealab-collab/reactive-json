import {evaluateTemplateValue} from "../../engine/TemplateSystem";

/**
 * Pseudo sprintf implementation.
 *
 * Taken from https://stackoverflow.com/a/43718864
 *
 * @licence CC-BY-SA 3.0
 * @author https://stackoverflow.com/users/6314667/7vujy0f0hy and community.
 *
 * @param {string} str The string to format.
 * @param {...string} argv The replacement arguments.
 *
 * @returns {*}
 */
const sprintf = (str, ...argv) => !argv.length
    ? str
    : sprintf(str = str.replace(sprintf.token || "$token", argv.shift()), ...argv);

/**
 * Formats the given string with replacement arguments.
 *
 * @param {{globalDataContext: {}, templateContext: {}}} templateContexts Template contexts.
 * @param {string} toFormat The string to format.
 * @param {...string} argv The replacement arguments.
 */
export const formatString = ({templateContexts}, toFormat, ...argv) => {
    const evaluatedArgs = argv.map(
        (toEvaluate) => {
            return evaluateTemplateValue({
                globalDataContext: templateContexts.globalDataContext,
                templateContext: templateContexts.templateContext,
                valueToEvaluate: toEvaluate
            });
        }
    )
    return sprintf(toFormat, ...evaluatedArgs);
};

/**
 * Formats the given data with replacement arguments if possible.
 *
 * @param {{templateContexts: {globalDataContext: {}, templateContext: {}}}} options Template contexts.
 * @param {*} toFormat The data to format.
 */
export const maybeFormatString = (options, toFormat) => {
    if (typeof toFormat === "string") {
        return toFormat;
    }

    if (Array.isArray(toFormat)) {
        const [toFormatReal, ...args] = toFormat;

        return formatString(options, toFormatReal, ...args);
    }

    // Unsupported data to format.
    return "";
};
