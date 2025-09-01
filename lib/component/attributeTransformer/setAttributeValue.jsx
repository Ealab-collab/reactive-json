import { normalizeAttributeNameForReactJsx } from "../../engine";
import { evaluateTemplateValue } from "../../engine/TemplateSystem";

/**
 * Set the value of an attribute.
 *
 * @param {{ attributes: Object, globalDataContext: Object, singleTransformProps: Object, templateContext: Object }} props
 * @returns {Object} The attributes object with the value set.
 */
export const setAttributeValue = ({ attributes, globalDataContext, singleTransformProps, templateContext }) => {
    const { name, mode = "append", value, preventDuplicateValues = true, separator = " " } = singleTransformProps;

    const evaluatedValue = evaluateTemplateValue({
        valueToEvaluate: value,
        globalDataContext,
        templateContext,
    });

    // Normalize the attribute name.
    const normalizedName = normalizeAttributeNameForReactJsx(name);

    if (mode === "replace") {
        // Replace mode: completely overwrite the attribute value.
        attributes[normalizedName] = evaluatedValue;
    } else {
        // Append mode: add the value to the existing attribute.
        const currentValue = attributes[normalizedName] || "";
        const currentValues = currentValue ? currentValue.split(separator) : [];

        // Check if we should add the value (based on duplicate prevention).
        if (!preventDuplicateValues || !currentValues.includes(evaluatedValue)) {
            const newValues = [...currentValues, evaluatedValue];
            attributes[normalizedName] = newValues.join(separator);
        }
    }

    return attributes;
};
