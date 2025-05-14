import {useContext} from 'react';
import {Form} from 'react-bootstrap';
import {GlobalDataContext} from "../../../engine/GlobalDataContext.jsx";
import {ActionDependant} from "../../../engine/Actions.jsx";
import {TemplateContext} from "../../../engine/TemplateContext.jsx";
import {evaluateTemplateValue, useEvaluatedAttributes} from "../../../engine/TemplateSystem.jsx";
import {propsDataLocationToPathAndValue} from "./formElementsCommon.jsx";

export const TextField = ({props, datafield, path}) => {
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

    const onChange = (e) => {
        globalDataContext.updateData(e.currentTarget.value, formDataPath);
    };

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

    const maybeInputType = evaluateTemplateValue({
        valueToEvaluate: props.inputType,
        globalDataContext,
        templateContext
    });

    return (
        <ActionDependant {...props}>
            <Form.Group {...attributes} controlId={Math.random().toString()}>
                {maybeLabel && <Form.Label>{maybeLabel}</Form.Label>}
                <Form.Control
                    onChange={onChange}
                    placeholder={maybePlaceholder}
                    type={maybeInputType ?? "text"}
                    value={formData ?? ""}
                    {...inputAttributes}/>
            </Form.Group>
        </ActionDependant>
    );
}
