import {Form} from "react-bootstrap";
import {ActionDependant} from "../../../engine/Actions.jsx";
import {useEvaluatedAttributes} from "../../../engine/TemplateSystem.jsx";
import {propsDataLocationToPathAndValue} from "./formElementsCommon.jsx";
import {useContext} from "react";
import {GlobalDataContext} from "../../../engine/GlobalDataContext.jsx";
import {TemplateContext} from "../../../engine/TemplateContext.jsx";

export const DateField = (componentProps) => {
    // TODO: type date & datetime-local support.
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const props = componentProps.props;

    const attributes = useEvaluatedAttributes(props.attributes);

    const {
        formData,
        formDataPath,
    } = propsDataLocationToPathAndValue({
        currentPath: componentProps.path,
        datafield: componentProps.datafield,
        dataLocation: props.dataLocation,
        defaultValue: props.defaultFieldValue,
        globalDataContext,
        templateContext,
    });

    const onChange = (e) => {
        globalDataContext.updateData(e.target.value, formDataPath);
    };

    return <ActionDependant {...props}>
        <Form.Group {...attributes} controlId={Math.random().toString()}>
            {props.label && (<Form.Label>{props.label}</Form.Label>)}
            <Form.Control onChange={onChange} type={"datetime-local"} value={formData ?? ""}/>
        </Form.Group>
    </ActionDependant>;
};
