import React, {useContext} from 'react';
import Form from 'react-bootstrap/Form';
import {propsDataLocationToPathAndValue} from "./formElementsCommon";
import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {
    evaluateAttributes,
    evaluateTemplateValue,
} from "../../../engine/TemplateSystem";
import View from "../../../engine/View";

const CheckBoxField = ({props, currentData, datafield, path}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const {updateData} = globalDataContext;

    const attributes = evaluateAttributes(
        {
            attrs: props.attributes,
            globalDataContext,
            templateContext,
            options: {
                normalizeBeforeEvaluation: true,
            },
        });

    let options;

    const dynamicOptions = props.dynamicOptions ?? undefined;

    if (dynamicOptions) {
        // Build the options through the given data.
        options = evaluateTemplateValue({valueToEvaluate: dynamicOptions, globalDataContext, templateContext}) ?? [];
    } else {
        options = props.options ?? [];
    }

    const controlType = props.controlType ?? undefined;

    // This tells how to save the data when one or more inputs are available.
    const isUsingSingleValueData = () => {
        if (props.controlType === "radio") {
            // Radios can only have a single value.
            return true;
        }

        if (props.multiple !== undefined && props.multiple !== false) {
            // Use the array structure.
            return props.multiple;
        }

        // If the options length is > 1, we use the array structure.
        return props.options?.length === 1;
    };

    const usesSingleValueData = isUsingSingleValueData();

    // This is the field value when the data is not supplied on initialization.
    const defaultFieldValue = props.defaultFieldValue ?? (!usesSingleValueData ? [] : undefined);

    const {
        formData: checkboxFormData,
        formDataPath,
    } = propsDataLocationToPathAndValue({
        currentPath: path,
        datafield,
        dataLocation: props.dataLocation,
        defaultValue: defaultFieldValue,
        globalDataContext,
        templateContext,
    });

    const changeValue = (e) => {
        if (controlType === "radio") {
            // When radio, use the "value" property.
            // When the value is an empty string, we unset the value.
            // Note: this could be made configurable, to keep the data key when the value is an empty string.
            let valueToSet;

            switch (e.currentTarget.value) {
                case "":
                    valueToSet = undefined;
                    break;

                case "true":
                    valueToSet = true;
                    break;

                case "false":
                    valueToSet = false;
                    break;

                case "null":
                    valueToSet = null;
                    break;

                default:
                    valueToSet = e.currentTarget.value;
                    break;
            }

            updateData(valueToSet, formDataPath);
            return;
        }

        if (usesSingleValueData) {
            // Save the value directly.
            updateData(e.currentTarget.checked, formDataPath);
            return;
        }

        // Add the value or remove it from the array.
        let formDataClone = JSON.parse(JSON.stringify(checkboxFormData));

        if (typeof formDataClone !== "object") {
            // Normalize the value with an object-like structure.
            formDataClone = [formDataClone];
        }

        if (e.currentTarget.checked) {
            // Add the item.
            formDataClone = addCheckedValueToData(formDataClone, e.currentTarget.value);
        } else {
            // Remove the item.
            formDataClone = removeCheckedValueFromData(formDataClone, e.currentTarget.value);
        }

        updateData(formDataClone, formDataPath);
    }

    return <ActionDependant {...props}>
        <Form.Group {...attributes} controlId={Math.random().toString()}>
            {options.map((option, i) => {
                // The option value.
                const finalOptionValue = typeof option.value === "string" ? evaluateTemplateValue({
                    globalDataContext: globalDataContext,
                    templateContext: templateContext,
                    valueToEvaluate: option.value,
                }) : option.value;

                const optionAttributes = evaluateAttributes({attrs: option.attributes ?? [], templateContext, globalDataContext, options: {normalizeBeforeEvaluation: true}});

                return <Form.Check
                    {...optionAttributes}
                    checked={isChecked(checkboxFormData, finalOptionValue)}
                    key={i}
                    label={<View
                        currentData={currentData?.["options"]?.[i]?.["label"] ?? undefined}
                        datafield={"label"}
                        path={path + ".options." + i + ".label"}
                        props={option.label}/>}
                    id={`${Math.random()}`}
                    name={path}
                    onChange={changeValue}
                    type={controlType}
                    value={finalOptionValue}
                />
            })}
        </Form.Group>
    </ActionDependant>;
}

function isChecked(checkboxFormData, finalOptionValue) {
    if (Array.isArray(checkboxFormData)) {
        return checkboxFormData.includes(finalOptionValue);
    }

    if (typeof checkboxFormData === 'object') {
        return Object.values(checkboxFormData).includes(finalOptionValue);
    }

    if (typeof checkboxFormData === "string") {
        return checkboxFormData === finalOptionValue;
    }

    return checkboxFormData === finalOptionValue;
}

function addCheckedValueToData(checkboxFormData, optionValue) {
    if (Array.isArray(checkboxFormData)) {
        checkboxFormData.includes(optionValue) || checkboxFormData.push(optionValue);
        return checkboxFormData;
    }

    if (typeof checkboxFormData === 'object') {
        const arrayValuesCopy = Object.values(checkboxFormData);
        arrayValuesCopy.includes(optionValue) || arrayValuesCopy.push(optionValue);
        return arrayValuesCopy;
    }

    throw new Error('CheckboxField: the value to set is not properly initialized as an object or array.');
}

function removeCheckedValueFromData(checkboxFormData, optionValue) {
    function removeIfIncluded(data, optionValue) {
        data.includes(optionValue) && data.splice(data.indexOf(optionValue), 1);
    }

    if (Array.isArray(checkboxFormData)) {
        removeIfIncluded(checkboxFormData, optionValue);
        return checkboxFormData;
    }

    if (typeof checkboxFormData === 'object') {
        const arrayValuesCopy = Object.values(checkboxFormData);
        removeIfIncluded(arrayValuesCopy, optionValue);
        return arrayValuesCopy;
    }

    throw new Error('CheckboxField: the value to set is not properly initialized as an object or array.');
}

export default CheckBoxField;
