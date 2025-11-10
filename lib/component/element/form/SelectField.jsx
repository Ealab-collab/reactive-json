import { useContext, useRef, useMemo } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { evaluateTemplateValue, useEvaluatedAttributes } from "../../../engine/TemplateSystem.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { propsDataLocationToPathAndValue } from "../../../engine/utility/formElementsCommon.jsx";
import { View } from "../../../engine/View.jsx";

export const SelectField = ({ props, datafield, path, currentData }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const mainAttributesHolderRef = useRef(null);

    // This "attributes" option is used for the select when it is not wrapped in a div,
    // or is used for the wrapper when the select is wrapped in a div.
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
        let value = e.currentTarget.value;

        // Handle empty string conversion
        if (value === "" && !props.allowEmptyStringAsValue) {
            value = undefined;
        } else if (value === "true") {
            value = true;
        } else if (value === "false") {
            value = false;
        } else if (value === "null") {
            value = null;
        }

        globalDataContext.updateData(value, formDataPath);
    };

    // Handle options: dynamicOptions takes precedence over options.
    let options;
    if (props.dynamicOptions) {
        // dynamicOptions is always a template reference string.
        options = evaluateTemplateValue({
            valueToEvaluate: props.dynamicOptions,
            globalDataContext,
            templateContext,
        });
    } else if (props.options) {
        // options is a static array, use it directly.
        options = props.options;
    } else {
        options = [];
    }

    if (!Array.isArray(options)) {
        options = [];
    }

    // Determine if wrapper should be used.
    const hasLabel = Boolean(props.label);
    const forceWrapper = props.forceWrapper;
    const useWrapper = forceWrapper === true || (forceWrapper !== false && hasLabel);

    // Prepare select attributes.
    const finalSelectAttributes = {
        onChange,
        value: formData ?? "",
        ...inputAttributes,
    };

    if (!useWrapper) {
        // Merge "attributes" with "inputAttributes".
        // This is the simple case where the select is not wrapped in a div.
        Object.assign(finalSelectAttributes, attributes);
    }

    // Use the given select ID or generate unique ID for label and select.
    const selectId = useMemo(() => {
        if (finalSelectAttributes.id) {
            // There is an id in the finalSelectAttributes, so we use it.
            return finalSelectAttributes.id;
        }

        // There is no ID in the finalSelectAttributes, so we generate a unique ID.
        return `select-${Math.random().toString(36).substring(2, 9)}`;
    }, [finalSelectAttributes.id]);

    finalSelectAttributes.id = selectId;

    const finalLabelAttributes = {
        htmlFor: selectId,
        ...labelAttributes,
    };

    const selectElement = (
        <select ref={mainAttributesHolderRef} {...finalSelectAttributes}>
            {options.length > 0 ? (
                options.map((option, index) => {
                    const optionValue = option.value ?? "";
                    const optionLabel = evaluateTemplateValue({
                        valueToEvaluate: option.label,
                        globalDataContext,
                        templateContext,
                    }) ?? "";
                    return (
                        <option key={index} value={optionValue}>
                            {optionLabel}
                        </option>
                    );
                })
            ) : (
                <option value="">No options available</option>
            )}
        </select>
    );

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
                    {selectElement}
                </div>
            ) : (
                <>
                    {labelElement}
                    {selectElement}
                </>
            )}
        </ActionDependant>
    );
};

