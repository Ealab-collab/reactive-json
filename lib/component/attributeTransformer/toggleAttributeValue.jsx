import { normalizeAttributeNameForReactJsx } from "../../engine";
import { evaluateTemplateValue } from "../../engine/TemplateSystem";

/**
 * Toggles the presence of a specific value in an HTML attribute. Supports both simple on-off toggles and cyclic toggling through multiple values.
 *
 * @param {{ attributes: Object, globalDataContext: Object, singleTransformProps: Object, templateContext: Object }} props
 * @returns {Object} The attributes object with the toggled value.
 */
export const toggleAttributeValue = ({ attributes, globalDataContext, singleTransformProps, templateContext }) => {
    const { name, value, separator = " ", keepAttributeWhenEmpty = false } = singleTransformProps || {};

    if (!name || value === undefined) {
        return attributes;
    }

    const evaluatedValue = evaluateTemplateValue({
        valueToEvaluate: value,
        globalDataContext,
        templateContext,
    });

    // Normalize the attribute name for React JSX compatibility.
    const normalizedName = normalizeAttributeNameForReactJsx(name);

    // Get base attribute value from current attributes (equivalent to component props).
    // This is necessary to avoid toggling the value again after a re-render.
    // The result of the toggle is then consistent with the initial state.
    const baseValue = attributes[normalizedName] || "";

    // Split base values and filter out empty ones.
    const baseValues = baseValue ? baseValue.split(separator).filter((val) => val.trim() !== "") : [];

    let newValues = [...baseValues];

    if (Array.isArray(evaluatedValue)) {
        // Cyclic Toggle (array value).
        const arrayValues = evaluatedValue.map((v) => String(v));

        if (arrayValues.length === 0) {
            // Empty array, do nothing.
            return attributes;
        }

        if (arrayValues.length === 1) {
            // Single value array - behaves like string toggle.
            const toggleValue = arrayValues[0];
            const valueIndex = newValues.indexOf(toggleValue);

            if (valueIndex > -1) {
                // Remove the value.
                newValues.splice(valueIndex, 1);
            } else {
                // Add the value.
                if (toggleValue !== "") {
                    newValues.push(toggleValue);
                }
            }
        } else {
            // Multi-value array - cyclic behavior.
            // Find first match in current values.
            let foundIndex = -1;
            let foundArrayIndex = -1;

            for (let i = 0; i < arrayValues.length; i++) {
                const arrayVal = arrayValues[i];
                const currentIndex = newValues.indexOf(arrayVal);
                if (currentIndex > -1) {
                    foundIndex = currentIndex;
                    foundArrayIndex = i;
                    break;
                }
            }

            if (foundIndex > -1) {
                // Found a value, replace with next in cycle.
                const nextArrayIndex = (foundArrayIndex + 1) % arrayValues.length;
                const nextValue = arrayValues[nextArrayIndex];

                // Remove current value.
                newValues.splice(foundIndex, 1);

                // Add next value (unless it's empty string).
                if (nextValue !== "") {
                    newValues.push(nextValue);
                }
            } else {
                // No array values present, apply first array value.
                const firstValue = arrayValues[0];
                if (firstValue !== "") {
                    newValues.push(firstValue);
                }
            }
        }
    } else {
        // Simple Toggle (string value).
        const toggleValue = String(evaluatedValue);
        const valueIndex = newValues.indexOf(toggleValue);

        if (valueIndex > -1) {
            // Value exists, remove it.
            newValues.splice(valueIndex, 1);
        } else {
            // Value doesn't exist, add it.
            newValues.push(toggleValue);
        }
    }

    // Update the attribute.
    const finalAttributeValue = newValues.join(separator);

    if (finalAttributeValue.trim() === "") {
        if (keepAttributeWhenEmpty) {
            // Keep empty attribute.
            attributes[normalizedName] = "";
        } else {
            // Remove attribute completely.
            delete attributes[normalizedName];
        }
    } else {
        // Set new value.
        attributes[normalizedName] = finalAttributeValue;
    }

    return attributes;
};


