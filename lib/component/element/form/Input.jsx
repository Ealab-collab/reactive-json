import { useContext, useRef, useMemo } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { evaluateTemplateValue, useEvaluatedAttributes } from "../../../engine/TemplateSystem.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { propsDataLocationToPathAndValue } from "../../../engine/utility/formElementsCommon.jsx";
import { View } from "../../../engine/View.jsx";

export const Input = ({ props, datafield, path, currentData }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const mainAttributesHolderRef = useRef(null);

    // This "attributes" option is used for the input when it is not wrapped in a div,
    // or is used for the wrapper when the input is wrapped in a div.
    const attributes = useEvaluatedAttributes(props.attributes);
    const inputAttributes = useEvaluatedAttributes(props.inputAttributes ?? []);
    const labelAttributes = useEvaluatedAttributes(props.labelAttributes ?? []);

    const { formData, formDataPath } = propsDataLocationToPathAndValue({
        currentPath: path,
        datafield: datafield,
        dataLocation: props.dataLocation,
        defaultValue: props.defaultFieldValue,
        globalDataContext,
        templateContext,
    });

    const onChange = (e) => {
        globalDataContext.updateData(e.currentTarget.value, formDataPath);
    };

    const maybePlaceholder = evaluateTemplateValue({
        valueToEvaluate: props.placeholder,
        globalDataContext,
        templateContext,
    });

    const maybeInputType = evaluateTemplateValue({
        valueToEvaluate: props.inputType,
        globalDataContext,
        templateContext,
    });

    // Determine if wrapper should be used.
    const hasLabel = Boolean(props.label);
    const forceWrapper = props.forceWrapper;
    const useWrapper = forceWrapper === true || (forceWrapper !== false && hasLabel);

    // Prepare input attributes.
    const finalInputAttributes = {
        onChange,
        placeholder: maybePlaceholder,
        type: maybeInputType ?? "text",
        value: formData ?? "",
        ...inputAttributes,
    };

    if (!useWrapper) {
        // Merge "attributes" with "inputAttributes".
        // This is the simple case where the input is not wrapped in a div.
        Object.assign(finalInputAttributes, attributes);
    }

    // Use the given input ID or generate unique ID for label and input.
    const inputId = useMemo(() => {
        if (finalInputAttributes.id) {
            // There is an id in the finalInputAttributes, so we use it.
            return finalInputAttributes.id;
        }

        // There is no ID in the finalInputAttributes, so we generate a unique ID.
        return `input-${Math.random().toString(36).substring(2, 9)}`;
    }, [finalInputAttributes.id]);

    finalInputAttributes.id = inputId;

    const finalLabelAttributes = {
        htmlFor: inputId,
        ...labelAttributes,
    };

    const inputElement = <input ref={mainAttributesHolderRef} {...finalInputAttributes} />;

    const labelElement = hasLabel && (
        <label {...finalLabelAttributes}>
            <View
                currentData={currentData?.["label"] ?? undefined}
                datafield={"label"}
                path={path + ".label"}
                props={props.label}
            />
        </label>
    );

    return (
        <ActionDependant {...props} attributesHolderRef={mainAttributesHolderRef}>
            {useWrapper ? (
                <div {...attributes}>
                    {labelElement}
                    {inputElement}
                </div>
            ) : (
                <>
                    {labelElement}
                    {inputElement}
                </>
            )}
        </ActionDependant>
    );
};
