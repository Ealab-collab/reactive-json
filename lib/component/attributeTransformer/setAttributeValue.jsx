import { normalizeAttributeNameForReactJsx } from "../../engine";
import { evaluateTemplateValue } from "../../engine/TemplateSystem";

/**
 * Merge two objects property by property, applying string merge logic for each property.
 * In append mode, applies string append logic property by property.
 * If a property doesn't have the expected format for append, it's replaced by the new value.
 *
 * @param {Object} currentObject - The existing object to merge into.
 * @param {Object} newObject - The new object with properties to merge.
 * @param {boolean} preventDuplicateValues - Whether to prevent duplicate values in strings.
 * @param {string} separator - The separator for string values.
 * @returns {Object} The merged object (new object to avoid mutation issues).
 */
const mergeObjectsRecursively = (currentObject, newObject, preventDuplicateValues, separator) => {
    // Work on a third-party object to avoid loop issues
    const merged = { ...currentObject };

    for (const key in newObject) {
        if (Object.prototype.hasOwnProperty.call(newObject, key)) {
            const newValue = newObject[key];
            const currentValue = merged[key];

            // Handle nested objects recursively.
            if (newValue !== null && typeof newValue === "object" && !Array.isArray(newValue)) {
                if (currentValue !== null && typeof currentValue === "object" && !Array.isArray(currentValue)) {
                    // Both are objects, merge recursively.
                    merged[key] = mergeObjectsRecursively(currentValue, newValue, preventDuplicateValues, separator);
                } else {
                    // Current value is not an object, replace with new object.
                    merged[key] = newValue;
                }
            } else {
                // Append mode: apply string merge logic property by property.
                if (typeof currentValue === "string" && typeof newValue === "string") {
                    // Both are strings: apply append logic.
                    const currentValues = currentValue ? currentValue.split(separator) : [];
                    if (!preventDuplicateValues || !currentValues.includes(newValue)) {
                        const newValues = [...currentValues, newValue];
                        merged[key] = newValues.join(separator);
                    } else {
                        // Value already exists, keep current.
                        merged[key] = currentValue;
                    }
                } else {
                    // Current value doesn't have the expected format (not a string) or new value is not a string.
                    // Replace with the new value (value has precedence).
                    merged[key] = newValue;
                }
            }
        }
    }

    return merged;
};

/**
 * Set the value of an attribute. Supports both string and object values.
 * For object values, supports merge mode to combine properties recursively.
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

    // Handle undefined value: ignore in append mode, assign undefined in replace mode
    if (evaluatedValue === undefined) {
        if (mode === "append") {
            // Append mode: ignore undefined values, keep current attribute unchanged
            return attributes;
        } else {
            // Replace mode: assign undefined to the attribute
            attributes[normalizedName] = undefined;
            return attributes;
        }
    }

    // Determine mode: string mode or object mode based on value type
    const isObjectValue = evaluatedValue !== null && typeof evaluatedValue === "object" && !Array.isArray(evaluatedValue);

    if (isObjectValue) {
        // Object mode: handles style objects and other object attributes
        if (mode === "replace") {
            // Replace mode: completely overwrite the attribute value.
            attributes[normalizedName] = evaluatedValue;
        } else {
            // Append mode: start from current object and merge property by property.
            const currentValue = attributes[normalizedName] || {};
            const currentObject = typeof currentValue === "object" && !Array.isArray(currentValue) ? currentValue : {};

            // Merge property by property, applying string append logic where applicable.
            // Work on a third-party object to avoid mutation issues.
            attributes[normalizedName] = mergeObjectsRecursively(
                currentObject,
                evaluatedValue,
                preventDuplicateValues,
                separator
            );
        }
    } else {
        // String mode: handles simple string attributes
        if (mode === "replace") {
            // Replace mode: completely overwrite the attribute value.
            attributes[normalizedName] = evaluatedValue;
        } else {
            // Append mode: add the value to the existing attribute.
            const currentValue = attributes[normalizedName] || "";

            // If currentValue is not a string, replace it with the new value.
            if (typeof currentValue !== "string") {
                attributes[normalizedName] = evaluatedValue;
                return attributes;
            }

            const currentValues = currentValue ? currentValue.split(separator) : [];

            // Check if we should add the value (based on duplicate prevention).
            if (!preventDuplicateValues || !currentValues.includes(evaluatedValue)) {
                const newValues = [...currentValues, evaluatedValue];
                attributes[normalizedName] = newValues.join(separator);
            }
        }
    }

    return attributes;
};
