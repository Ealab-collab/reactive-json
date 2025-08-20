import { useEffect, useContext } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

export const UnsetAttributeValue = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const { attributesHolderRef } = props;

    const { name, value, separator = " ", unsetAllOccurrences, unsetCount } = props.actionProps || {};

    useEffect(() => {
        if (!attributesHolderRef?.current || !name || value === undefined) {
            return;
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

        const element = attributesHolderRef.current;
        const currentValue = element.getAttribute(name) || "";

        if (!currentValue) {
            // Nothing to remove.
            return;
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
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, newAttributeValue);
        }
    }, [
        name,
        value,
        separator,
        unsetAllOccurrences,
        unsetCount,
        globalDataContext.data,
        templateContext,
        attributesHolderRef,
    ]);

    return props.children;
};
