import { useContext, useEffect, useRef, useMemo } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { evaluateAttributes, useEvaluatedAttributes } from "../../../engine/TemplateSystem.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import {
    evaluateFieldOptions,
    propsDataLocationToPathAndValue,
} from "../../../engine/utility/formElementsCommon.jsx";
import { View } from "../../../engine/View.jsx";

// The option values of the mounted single-value checkbox fields, per data path.
const singleValueFieldsByPath = new Map();

// The data paths for which the shared single-value warning has already been shown.
const warnedSharedPaths = new Set();

/**
 * Warns when several single-value checkbox fields with different values share the same data path.
 *
 * Such fields overwrite each other's value, so they check and uncheck together.
 * This is the typical outcome of one CheckBoxField per Switch item whose data is not an array.
 *
 * @param {string|undefined} formDataPath The data path of the field, or undefined when it is not single-value.
 * @param {*} optionValue The value of the field's option.
 */
const useSharedSingleValueWarning = (formDataPath, optionValue) => {
    useEffect(() => {
        if (formDataPath === undefined) {
            return undefined;
        }

        const registration = {};
        const fields = singleValueFieldsByPath.get(formDataPath) ?? new Map();
        fields.set(registration, optionValue);
        singleValueFieldsByPath.set(formDataPath, fields);

        if (new Set(fields.values()).size > 1 && !warnedSharedPaths.has(formDataPath)) {
            warnedSharedPaths.add(formDataPath);
            console.warn(
                `CheckBoxField: several single-value checkbox fields share the data location "${formDataPath}", ` +
                    "so they check and uncheck together. Initialize this data as an array (e.g. []) " +
                    'or set "multiple: true" on the fields to store the list of checked values.'
            );
        }

        return () => {
            fields.delete(registration);

            if (fields.size === 0) {
                singleValueFieldsByPath.delete(formDataPath);
            }
        };
    }, [formDataPath, optionValue]);
};

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

    // dynamicOptions takes precedence over options.
    const options = evaluateFieldOptions({ props, globalDataContext, templateContext });

    const controlType = props.controlType || "checkbox";
    const isRadio = controlType === "radio";
    // An array in the data is a list of checked values, even when the field shows a single option
    // (e.g. one CheckBoxField per Switch item, all bound to the same array).
    const multiple = props.multiple ?? (Array.isArray(formData) || options.length > 1);
    const isSingleValue = !isRadio && !multiple && options.length === 1;

    // Generate unique base ID for all options in this field.
    const baseId = useMemo(() => {
        // Check if there's an id in inputAttributes
        if (inputAttributes.id) {
            return inputAttributes.id;
        }
        // Generate a unique ID.
        return `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    }, [inputAttributes.id]);

    useSharedSingleValueWarning(isSingleValue ? formDataPath : undefined, options[0]?.value);

    if (options.length === 0) {
        return null;
    }

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
            // Single checkbox: store boolean or value.
            globalDataContext.updateData(e.target.checked ? optionValue : false, formDataPath);
        }
    };

    // Determine if wrapper should be used.
    const hasLabel = Boolean(props.label);
    const forceWrapper = props.forceWrapper;
    const useWrapper = forceWrapper === true || (forceWrapper !== false && hasLabel);

    // Remove id from inputAttributes if present, since we'll set it per option.
    const { id: _removedId, ...inputAttributesWithoutId } = inputAttributes;

    // The id of labelAttributes belongs to the field label only.
    const { id: labelId, ...optionLabelAttributes } = labelAttributes;

    // A single option without its own label is labelled by the field label.
    // Otherwise, the field label names the group of options.
    const labelsSingleControl = hasLabel && options.length === 1 && !options[0].label;
    const labelsGroup = hasLabel && !labelsSingleControl;
    const fieldLabelId = labelId ?? `${baseId}-label`;

    const checkboxElements = options.map((option, index) => {
        const optionValue = option.value;
        const optionLabel = option.label;
        const optionId = `${baseId}-${index}`;

        let isChecked = false;
        if (isRadio) {
            isChecked = formData === optionValue;
        } else if (multiple) {
            isChecked = Array.isArray(formData) && formData.includes(optionValue);
        } else {
            isChecked = formData === optionValue || formData === true;
        }

        const optionAttributes = evaluateAttributes({
            attrs: option.attributes,
            globalDataContext,
            templateContext,
            options: { normalizeBeforeEvaluation: true },
        });

        // Merge inputAttributes (without id) with option-specific attributes.
        const finalInputAttributes = {
            type: controlType,
            id: optionId,
            // Radios of the same field form a native group (single tab stop, arrow keys navigation).
            ...(isRadio ? { name: baseId } : {}),
            checked: isChecked,
            onChange: (e) => onChange(e, optionValue),
            value: optionValue,
            ...inputAttributesWithoutId,
        };

        const finalLabelAttributes = {
            htmlFor: optionId,
            ...optionLabelAttributes,
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

    const finalFieldLabelAttributes = labelsSingleControl
        ? { htmlFor: `${baseId}-0`, ...labelAttributes }
        : { ...labelAttributes, id: fieldLabelId };

    // The element containing the options is exposed as a group named by the field label.
    const groupAttributes = labelsGroup ? { role: "group", "aria-labelledby": fieldLabelId } : {};

    const labelElement = hasLabel && (
        <label {...finalFieldLabelAttributes}>
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
                <div {...groupAttributes} {...attributes}>
                    {labelElement}
                    {checkboxElements}
                </div>
            ) : (
                <>
                    {labelElement}
                    <div {...groupAttributes} {...attributes}>
                        {checkboxElements}
                    </div>
                </>
            )}
        </ActionDependant>
    );
};
