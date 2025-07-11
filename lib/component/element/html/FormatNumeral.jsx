import {ActionDependant} from "../../../engine/Actions.jsx";
import {GlobalDataContext} from "../../../engine/GlobalDataContext.jsx";
import {TemplateContext} from "../../../engine/TemplateContext.jsx";
import {evaluateTemplateValue} from "../../../engine/TemplateSystem.jsx";
import {useContext} from "react";

/**
 * Transforms a number into a numeral of a specific language: roman, upper latin, lower latin, ... and custom.
 */
export const FormatNumeral = ({props}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    let formatted = false;

    let evaluated = undefined;
    let evaluatedFormat = undefined;

    if (props.content !== undefined) {
        evaluated = evaluateTemplateValue({valueToEvaluate: props.content, globalDataContext, templateContext});
    }

    if (evaluated === undefined || evaluated === null || evaluated === "") {
        // No value to format.
        return null;
    }

    if (props.format !== undefined) {
        evaluatedFormat = evaluateTemplateValue({valueToEvaluate: props.format, globalDataContext, templateContext});
    }

    switch (evaluatedFormat) {
        case "roman-upper":
            formatted = convertArabicToRoman(evaluated);
            break;

        case "roman-lower":
            formatted = convertArabicToRoman(evaluated, true);
            break;

        case "latin-upper":
            formatted = convertArabicToLatinLetters(evaluated);
            break;

        case "latin-lower":
            formatted = convertArabicToLatinLetters(evaluated, true);
            break;

        default:
            // Provide the original value if no valid format is specified.
            formatted = evaluated;
            break;
    }

    return (
        <ActionDependant {...props}>
            <>
                {(formatted !== false) && formatted}
            </>
        </ActionDependant>
    );
};

/**
 * Converts an arabic number to latin letters.
 *
 * Implementation inspired by: https://stackoverflow.com/a/11090169.
 *
 * @param number The number to convert.
 * @param asLowerCase Set to true for lowercase.
 *
 * @returns {*|string|number|false} Number in roman counting, or false if invalid.
 */
function convertArabicToLatinLetters(number, asLowerCase = false) {
    if (number < 1) {
        return false;
    }

    let mod = number % 26,
        pow = number / 26 | 0,
        out = mod ? String.fromCharCode(64 + mod) : (--pow, 'Z');

    const letters = pow ? convertArabicToLatinLetters(pow) + out : out;

    return asLowerCase ? letters.toLowerCase() : letters;
}

/**
 * Converts an arabic number to roman conuting.
 *
 * Implementation inspired by: https://www.30secondsofcode.org/js/s/to-roman-numeral/.
 *
 * Added the lowercase option.
 *
 * @param number The number to convert.
 * @param asLowercase Set to true for lowercase.
 *
 * @returns {number|string|false} Number in roman counting, or false if invalid.
 */
function convertArabicToRoman(number, asLowercase = false) {
    if (number < 1) {
        return false;
    }

    const lookup = [
        ['M', 1000],
        ['CM', 900],
        ['D', 500],
        ['CD', 400],
        ['C', 100],
        ['XC', 90],
        ['L', 50],
        ['XL', 40],
        ['X', 10],
        ['IX', 9],
        ['V', 5],
        ['IV', 4],
        ['I', 1],
    ];

    const uppercase = lookup.reduce(
        (acc, [k, v]) => {
            acc += k.repeat(Math.floor(number / v));
            number = number % v;
            return acc;
        },
        '');

    return asLowercase ? uppercase.toLowerCase() : uppercase;
}
