import { useContext } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../../engine/TemplateSystem.jsx";
import { View } from "../../../engine/View.jsx";

/**
 * Shows the label associated to a value.
 *
 * Uses an option-like structure as data source.
 * Thus, it's compatible with SelectField, CheckBoxField...
 *
 * E.g.: [{"label": "Public name", "value": "option value"}].
 *
 * @param currentData
 * @param datafield
 * @param path
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
export const LabelFromValue = ({ currentData, datafield, path, props }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const dynamicOptions = props.dynamicOptions ?? undefined;

    let options;

    if (dynamicOptions) {
        // Build the options through the given data.
        options = evaluateTemplateValue({ valueToEvaluate: dynamicOptions, globalDataContext, templateContext }) ?? [];
    } else {
        options = props.options ?? [];
    }

    // This is the data that contains the current value of this component.
    let formData;

    // This is the field value when the data is not supplied on initialization.
    const defaultFieldValue = props.defaultFieldValue ?? undefined;

    const dataLocation = props.dataLocation ?? undefined;

    if (dataLocation) {
        // A custom data location has been specified.
        formData =
            evaluateTemplateValue({
                globalDataContext: globalDataContext,
                templateContext: templateContext,
                valueToEvaluate: dataLocation,
            }) ?? defaultFieldValue;
    } else {
        // Use the template data.
        if ((templateContext.templateData[datafield] ?? undefined) === undefined) {
            // Initialize the data for this component.
            if (typeof templateContext.templateData === "object" && templateContext.templateData !== null) {
                templateContext.templateData[datafield] = defaultFieldValue;
            } else {
                try {
                    templateContext.templateData = {};
                    templateContext.templateData[datafield] = defaultFieldValue;
                } catch (e) {
                    // Ignore read-only errors.
                }
            }
        }

        // The "form" data is located in the template context data,
        // under the datafield key. (Dev note: this is maybe not the best way to handle this.)
        formData = templateContext.templateData[datafield];
    }

    // Loose matching is opt-in: by default, the option value must strictly
    // equal the current value. Nullish values are never coerced (String(null)
    // would match an option whose value is the "null" string).
    const looseMatching = props.loose === true && formData !== null && formData !== undefined;

    const matchesValue = looseMatching
        ? (option) =>
              option.value !== null && option.value !== undefined && String(option.value) === String(formData)
        : (option) => option.value === formData;

    let finalValue = options.find(matchesValue);

    if (!finalValue || !finalValue.label) {
        if (!formData) {
            // Nothing to show.
            return null;
        }

        // Show the raw data.
        finalValue = formData;
    }

    return (
        <ActionDependant {...props}>
            <View currentData={currentData} datafield={datafield} path={path} props={finalValue.label} />
        </ActionDependant>
    );
};
