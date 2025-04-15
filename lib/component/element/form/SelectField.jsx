import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {dataLocationToPath, evaluateAttributes, evaluateTemplateValue} from "../../../engine/TemplateSystem";
import {useContext} from 'react';
import Form from 'react-bootstrap/Form';

const SelectField = ({props, data, path, datafield}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const {updateData} = globalDataContext;

    const dynamicOptions = props.dynamicOptions ?? undefined;

    let options;

    if (dynamicOptions) {
        // Build the options through the given data.
        options = evaluateTemplateValue({valueToEvaluate: dynamicOptions, globalDataContext, templateContext}) ?? [];
    } else {
        options = props.options ?? [];
    }

    let attributes = evaluateAttributes({
        attrs: props.attributes ?? {},
        globalDataContext,
        templateContext,
        options: {normalizeBeforeEvaluation: true}
    });

    const inputAttributes = evaluateAttributes({
        attrs: props.inputAttributes ?? {},
        globalDataContext,
        templateContext,
        options: {normalizeBeforeEvaluation: true}
    });

    // This is the data that contains the current value of SelectField.
    let formData;

    // This is the path that leads to the data.
    let formDataPath;

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

        formDataPath = dataLocationToPath({
            dataLocation: dataLocation,
            currentPath: path,
            globalDataContext,
            templateContext
        });
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

        formDataPath = dataLocationToPath({dataLocation: "~." + datafield, currentPath: templateContext.templatePath});
    }

    const changeValue = (e) => {
        let valueToSet;

        switch (e.currentTarget.value) {
            case "":
                if (props.allowEmptyStringAsValue) {
                    valueToSet = "";
                } else {
                    valueToSet = undefined;
                }

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
    }

    return (
        <ActionDependant {...props}>
            <Form.Group {...attributes} controlId={Math.random().toString()}>
                {props.label && <Form.Label>{props.label}</Form.Label>}
                <Form.Select
                    aria-label={props.label}
                    onChange={changeValue}
                    value={formData}
                    {...inputAttributes}>
                    {options.map((item, ind) => {
                        return <option key={'opt' + ind} value={item.value}>{item.label}</option>;
                    })}
                </Form.Select>
            </Form.Group>
        </ActionDependant>
    )
}

export default SelectField;