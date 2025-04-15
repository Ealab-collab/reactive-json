import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {evaluateTemplateValue} from "../../../engine/TemplateSystem";
import View from "../../../engine/View";
import {useContext} from "react";

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
const LabelFromValue = ({currentData, datafield, path, props}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const dynamicOptions = props.dynamicOptions ?? undefined;

    let options;

    if (dynamicOptions) {
        // Build the options through the given data.
        options = evaluateTemplateValue({valueToEvaluate: dynamicOptions, globalDataContext, templateContext}) ?? [];
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
        formData = evaluateTemplateValue({
            globalDataContext: globalDataContext,
            templateContext: templateContext,
            valueToEvaluate: dataLocation,
        }) ?? defaultFieldValue;
    } else {
        // Use the template data.
        if ((templateContext.templateData[datafield] ?? undefined) === undefined) {
            // Initialize the data for this component.
            templateContext.templateData = (typeof templateContext.templateData === "object") ? templateContext.templateData : {};
            templateContext.templateData[datafield] = defaultFieldValue;
        }

        // The "form" data is located in the template context data,
        // under the datafield key. (Dev note: this is maybe not the best way to handle this.)
        formData = templateContext.templateData[datafield];
    }

    let finalValue = options.find((option) => option.value === formData);

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
            <View
                currentData={currentData}
                datafield={datafield}
                path={path}
                props={finalValue.label}/>
        </ActionDependant>
    );
};

export default LabelFromValue;
