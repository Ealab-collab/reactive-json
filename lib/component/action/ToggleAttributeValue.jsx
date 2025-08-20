import { useEffect, useContext } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

export const ToggleAttributeValue = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const { attributesHolderRef } = props;

    const { name, value, separator = " ", keepAttributeWhenEmpty = false } = props.actionProps || {};

    useEffect(() => {
        if (!attributesHolderRef?.current || !name || value === undefined) {
            return;
        }

        const evaluatedValue = evaluateTemplateValue({
            valueToEvaluate: value,
            globalDataContext,
            templateContext,
        });

        // Get base attribute value from component props (not from DOM).
        // This is necessary to avoid toggling the value again after
        // a re-render. The result of the toggle is then consistent
        // with the initial state.
        const componentProps = props.componentProps || {};
        const baseAttributes = componentProps.attributes || {};
        const baseValue = baseAttributes[name] || "";

        // Split base values (from props) and filter out empty ones.
        const baseValues = baseValue ? baseValue.split(separator).filter((val) => val.trim() !== "") : [];

        let newValues = [...baseValues];

        if (Array.isArray(evaluatedValue)) {
            // Cyclic Toggle (array value).
            const arrayValues = evaluatedValue.map((v) => String(v));

            if (arrayValues.length === 0) {
                // Empty array, do nothing.
                return;
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

        // Apply the changes to the actual DOM element.
        const element = attributesHolderRef.current;
        const currentDomValue = element.getAttribute(name) || "";
        const currentDomValues = currentDomValue
            ? currentDomValue.split(separator).filter((val) => val.trim() !== "")
            : [];

        // Calculate the final result: merge base values changes with current DOM state.
        // Remove values that are no longer in newValues compared to baseValues.
        const valuesToRemove = baseValues.filter((val) => !newValues.includes(val));
        const valuesToAdd = newValues.filter((val) => !baseValues.includes(val));

        let finalValues = [...currentDomValues];

        // Remove values that should be removed.
        valuesToRemove.forEach((val) => {
            const index = finalValues.indexOf(val);
            if (index > -1) {
                finalValues.splice(index, 1);
            }
        });

        // Add values that should be added (avoiding duplicates).
        valuesToAdd.forEach((val) => {
            if (!finalValues.includes(val)) {
                finalValues.push(val);
            }
        });

        // Update the attribute.
        const finalAttributeValue = finalValues.join(separator);

        if (finalAttributeValue.trim() === "") {
            if (keepAttributeWhenEmpty) {
                // Keep empty attribute.
                element.setAttribute(name, "");
            } else {
                // Remove attribute completely.
                element.removeAttribute(name);
            }
        } else {
            // Set new value.
            element.setAttribute(name, finalAttributeValue);
        }
    }, [name, value, separator, keepAttributeWhenEmpty, globalDataContext.data, templateContext, attributesHolderRef]);

    return props.children;
};
