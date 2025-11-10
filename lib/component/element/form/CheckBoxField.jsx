import { useContext, useRef, useMemo } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { evaluateTemplateValue, useEvaluatedAttributes } from "../../../engine/TemplateSystem.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { propsDataLocationToPathAndValue } from "../../../engine/utility/formElementsCommon.jsx";
import { View } from "../../../engine/View.jsx";

export const CheckBoxField = ({ props, datafield, path, currentData }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const mainAttributesHolderRef = useRef(null);

    // This "attributes" option is used for the wrapper when useWrapper is true,
    // or for the container div when useWrapper is false.
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

    const options = evaluateTemplateValue({
        valueToEvaluate: props.options,
        globalDataContext,
        templateContext,
    }) || [];

    if (!Array.isArray(options) || options.length === 0) {
        return null;
    }

    const controlType = props.controlType || "checkbox";
    const multiple = props.multiple ?? (options.length > 1);
    const isRadio = controlType === "radio";

    const onChange = (e, optionValue) => {
        if (isRadio) {
            // Radio: store single value
            globalDataContext.updateData(optionValue, formDataPath);
        } else if (multiple) {
            // Multiple checkboxes: store array
            const currentArray = Array.isArray(formData) ? formData : [];
            if (e.target.checked) {
                if (!currentArray.includes(optionValue)) {
                    globalDataContext.updateData([...currentArray, optionValue], formDataPath);
                }
            } else {
                globalDataContext.updateData(
                    currentArray.filter((v) => v !== optionValue),
                    formDataPath
                );
            }
        } else {
            // Single checkbox: store boolean or value
            globalDataContext.updateData(e.target.checked ? optionValue : false, formDataPath);
        }
    };

    // Determine if wrapper should be used.
    const hasLabel = Boolean(props.label);
    const forceWrapper = props.forceWrapper;
    const useWrapper = forceWrapper === true || (forceWrapper !== false && hasLabel);

    // Generate unique base ID for all options in this field.
    const baseId = useMemo(() => {
        // Check if there's an id in inputAttributes
        if (inputAttributes.id) {
            return inputAttributes.id;
        }
        // Generate a unique ID.
        return `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    }, [inputAttributes.id]);

    // Remove id from inputAttributes if present, since we'll set it per option
    const { id: _removedId, ...inputAttributesWithoutId } = inputAttributes;

    const checkboxElements = options.map((option, index) => {
        const optionValue = option.value;
        const optionLabel = evaluateTemplateValue({
            valueToEvaluate: option.label,
            globalDataContext,
            templateContext,
        });
        const optionId = `${baseId}-${index}`;

        let isChecked = false;
        if (isRadio) {
            isChecked = formData === optionValue;
        } else if (multiple) {
            isChecked = Array.isArray(formData) && formData.includes(optionValue);
        } else {
            isChecked = formData === optionValue || formData === true;
        }

        const optionAttributes = useEvaluatedAttributes(option.attributes);

        // Merge inputAttributes (without id) with option-specific attributes
        const finalInputAttributes = {
            type: controlType,
            id: optionId,
            checked: isChecked,
            onChange: (e) => onChange(e, optionValue),
            value: optionValue,
            ...inputAttributesWithoutId,
        };

        const finalLabelAttributes = {
            htmlFor: optionId,
            ...labelAttributes,
        };

        return (
            <div key={index} {...optionAttributes}>
                <input ref={index === 0 ? mainAttributesHolderRef : null} {...finalInputAttributes} />
                {optionLabel && (
                    <label {...finalLabelAttributes} style={{ marginLeft: "0.5rem" }}>
                        {optionLabel}
                    </label>
                )}
            </div>
        );
    });

    const labelElement = hasLabel && (
        <label {...labelAttributes}>
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
                    {checkboxElements}
                </div>
            ) : (
                <>
                    {labelElement}
                    <div {...attributes}>
                        {checkboxElements}
                    </div>
                </>
            )}
        </ActionDependant>
    );
};

