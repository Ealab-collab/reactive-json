import { normalizeAttributeNameForReactJsx } from "../../engine";
import { evaluateTemplateValue } from "../../engine/TemplateSystem";

/**
 * Removes a specific value from an HTML attribute while preserving other values.
 *
 * @param {{ attributes: Object, globalDataContext: Object, singleTransformProps: Object, templateContext: Object }} props
 * @returns {Object} The attributes object after removal.
 */
export const unsetAttributeValue = ({ attributes, globalDataContext, singleTransformProps, templateContext }) => {
    const { name, value, separator = " ", unsetAllOccurrences, unsetCount } = singleTransformProps || {};

    if (!name || value === undefined) {
        return attributes;
    }

    const evaluatedValue = String(
        evaluateTemplateValue({
            valueToEvaluate: value,
            globalDataContext,
            templateContext,
        })
    );

    const evaluatedUnsetCount =
        unsetCount !== undefined
            ? evaluateTemplateValue({
                  valueToEvaluate: unsetCount,
                  globalDataContext,
                  templateContext,
              })
            : undefined;

    // Normalize the attribute name for React JSX compatibility.
    const normalizedName = normalizeAttributeNameForReactJsx(name);
    const currentValue = attributes[normalizedName] || "";

    if (!currentValue) {
        // Nothing to remove.
        return attributes;
    }

    const currentValues = currentValue.split(separator);
    let newValues = [...currentValues];

    (() => {
        if (unsetAllOccurrences === true) {
            // Remove ALL occurrences, ignore unsetCount.
            newValues = newValues.filter((val) => val !== evaluatedValue);
            return;
        }

        // unsetAllOccurrences is either false or undefined (or unknown).
        // Check if unsetCount is valid.
        const countAsNumber = parseInt(evaluatedUnsetCount, 10);
        const isValidCount =
            !isNaN(countAsNumber) && evaluatedUnsetCount !== undefined && evaluatedUnsetCount !== null;

        if (!isValidCount) {
            // Invalid unsetCount, fallback to remove ALL.
            newValues = newValues.filter((val) => val !== evaluatedValue);
            return;
        }

        if (countAsNumber === 0) {
            // Remove nothing.
            return;
        }

        if (countAsNumber > 0) {
            // Remove from beginning.
            let removedCount = 0;
            newValues = newValues.filter((val) => {
                if (val === evaluatedValue && removedCount < countAsNumber) {
                    removedCount++;
                    return false;
                }
                return true;
            });
            return;
        }

        // Remove from end.
        const absCount = Math.abs(countAsNumber);
        let removedCount = 0;

        // Reverse, remove, then reverse back.
        newValues = newValues
            .reverse()
            .filter((val) => {
                if (val === evaluatedValue && removedCount < absCount) {
                    removedCount++;
                    return false;
                }
                return true;
            })
            .reverse();
    })();

    // Update the attribute.
    const newAttributeValue = newValues.join(separator);

    if (newAttributeValue.trim() === "") {
        delete attributes[normalizedName];
    } else {
        attributes[normalizedName] = newAttributeValue;
    }

    return attributes;
};
