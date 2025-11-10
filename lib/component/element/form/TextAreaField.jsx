import { useContext, useRef, useMemo } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { evaluateTemplateValue, useEvaluatedAttributes } from "../../../engine/TemplateSystem.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { propsDataLocationToPathAndValue } from "../../../engine/utility/formElementsCommon.jsx";
import { View } from "../../../engine/View.jsx";

export const TextAreaField = ({ props, datafield, path, currentData }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const mainAttributesHolderRef = useRef(null);

    // This "attributes" option is used for the textarea when it is not wrapped in a div,
    // or is used for the wrapper when the textarea is wrapped in a div.
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

    const maybeRows = evaluateTemplateValue({
        valueToEvaluate: props.rows,
        globalDataContext,
        templateContext,
    });

    // Determine if wrapper should be used.
    const hasLabel = Boolean(props.label);
    const forceWrapper = props.forceWrapper;
    const useWrapper = forceWrapper === true || (forceWrapper !== false && hasLabel);

    // Prepare textarea attributes.
    const finalTextareaAttributes = {
        onChange,
        placeholder: maybePlaceholder,
        rows: maybeRows ?? 3,
        value: formData ?? "",
        ...inputAttributes,
    };

    if (!useWrapper) {
        // Merge "attributes" with "inputAttributes".
        // This is the simple case where the textarea is not wrapped in a div.
        Object.assign(finalTextareaAttributes, attributes);
    }

    // Use the given textarea ID or generate unique ID for label and textarea.
    const textareaId = useMemo(() => {
        if (finalTextareaAttributes.id) {
            // There is an id in the finalTextareaAttributes, so we use it.
            return finalTextareaAttributes.id;
        }

        // There is no ID in the finalTextareaAttributes, so we generate a unique ID.
        return `textarea-${Math.random().toString(36).substring(2, 9)}`;
    }, [finalTextareaAttributes.id]);

    finalTextareaAttributes.id = textareaId;

    const finalLabelAttributes = {
        htmlFor: textareaId,
        ...labelAttributes,
    };

    const textareaElement = <textarea ref={mainAttributesHolderRef} {...finalTextareaAttributes} />;

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
                    {textareaElement}
                </div>
            ) : (
                <>
                    {labelElement}
                    {textareaElement}
                </>
            )}
        </ActionDependant>
    );
};

