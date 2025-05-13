import {evaluateTemplateValue} from "../../engine/TemplateSystem";

/**
 * Copies data to the clipboard.
 *
 * @param {{}} props
 */
export const setClipboardData = async (props) => {
    const {globalDataContext, templateContext} = props;
    const evaluatedValue = evaluateTemplateValue({valueToEvaluate: props?.args?.value, globalDataContext, templateContext});

    if (typeof evaluatedValue === 'string') {
        try {
            // Attempt to copy to clipboard.
            await navigator.clipboard.writeText(evaluatedValue.toString());
        } catch (error) {
            console.error('Failed to copy data to the clipboard:', error);
        }
    }
};
