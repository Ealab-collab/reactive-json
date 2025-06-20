import {useContext} from 'react';
import {Form} from 'react-bootstrap';
import {GlobalDataContext} from "../../../engine/GlobalDataContext.jsx";
import {TemplateContext} from "../../../engine/TemplateContext.jsx";
import {useEvaluatedAttributes, evaluateTemplateValue} from "../../../engine/TemplateSystem.jsx";
import {propsDataLocationToPathAndValue} from "./formElementsCommon.jsx";
import {ActionDependant} from "../../../engine/Actions.jsx";

export const NumberField = ({props, datafield, path}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const attributes = useEvaluatedAttributes(props.attributes);
    const inputAttributes = useEvaluatedAttributes(props.inputAttributes ?? []);

    const {
        formData,
        formDataPath,
    } = propsDataLocationToPathAndValue({
        currentPath: path,
        datafield: datafield,
        dataLocation: props.dataLocation,
        defaultValue: props.defaultFieldValue,
        globalDataContext,
        templateContext,
    });

    const maybeLabel = evaluateTemplateValue({
        valueToEvaluate: props.label,
        globalDataContext,
        templateContext
    });

    const maybePlaceholder = evaluateTemplateValue({
        valueToEvaluate: props.placeholder,
        globalDataContext,
        templateContext
    });

    const onChange = (e) => {
        globalDataContext.updateData(e.currentTarget.value, formDataPath);
    };

    return (
        <ActionDependant {...props}>
            <Form.Group {...attributes} controlId={Math.random().toString()}>
                {maybeLabel && <Form.Label>{maybeLabel}</Form.Label>}
                <Form.Control
                    onChange={onChange}
                    type={"number"}
                    value={formData ?? ""}
                    placeholder={maybePlaceholder}
                    {...inputAttributes}
                />
            </Form.Group>
        </ActionDependant>
    );
}