import { useEffect, useContext } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

/**
 * Action that sets or modifies the value of an HTML attribute on the target element.
 *
 * @param {Object} props - Component props
 * @param {Object} props.actionProps - Configuration for the attribute modification
 * @param {string} props.actionProps.name - The name of the attribute to modify
 * @param {string} [props.actionProps.mode="append"] - The modification mode: "append" or "replace"
 * @param {*} props.actionProps.value - The value to set or append (supports template evaluation)
 * @param {boolean} [props.actionProps.preventDuplicateValues=true] - Whether to prevent duplicate values in append mode
 * @param {string} [props.actionProps.separator=" "] - The separator between values in append mode
 * @param {React.RefObject} props.attributesHolderRef - Ref to the DOM element that should receive the attribute modifications
 * @param {React.ReactNode} props.children - Child components to render unchanged
 * @returns {React.ReactNode} The children unchanged
 */
export const SetAttributeValue = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const { attributesHolderRef } = props;

    const { name, mode = "append", value, preventDuplicateValues = true, separator = " " } = props.actionProps;

    useEffect(() => {
        // Early return if we don't have the required elements
        if (!attributesHolderRef?.current || !name || value === undefined) {
            return;
        }

        // Evaluate the template value
        const evaluatedValue = String(
            evaluateTemplateValue({
                valueToEvaluate: value,
                globalDataContext,
                templateContext,
            })
        );

        const element = attributesHolderRef.current;

        if (mode === "replace") {
            // Replace mode: completely overwrite the attribute value
            element.setAttribute(name, evaluatedValue);
        } else {
            // Append mode: add the value to the existing attribute
            const currentValue = element.getAttribute(name) || "";
            const currentValues = currentValue ? currentValue.split(separator) : [];

            // Check if we should add the value (based on duplicate prevention)
            if (!preventDuplicateValues || !currentValues.includes(evaluatedValue)) {
                const newValues = [...currentValues, evaluatedValue];
                element.setAttribute(name, newValues.join(separator));
            }
        }
    }, [
        name,
        mode,
        value,
        preventDuplicateValues,
        separator,
        globalDataContext.data,
        templateContext,
        attributesHolderRef,
    ]);

    // Return children unchanged - this action doesn't wrap anything
    return props.children;
};
