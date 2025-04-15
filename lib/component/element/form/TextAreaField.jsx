import {useContext} from 'react';
import Form from 'react-bootstrap/Form';
import GlobalDataContext from "../../../engine/GlobalDataContext";
import ActionDependant from "../../../engine/Actions";
import TemplateContext from "../../../engine/TemplateContext";
import {useEvaluatedAttributes} from "../../../engine/TemplateSystem";
import {propsDataLocationToPathAndValue} from "./formElementsCommon";

const TextAreaField = ({props, datafield, path}) => {
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

    return (
        <ActionDependant {...props}>
            <Form.Group {...attributes} controlId={Math.random().toString()}>
                {props.label && <Form.Label>{props.label}</Form.Label>}
                <Form.Control
                    as={"textarea"}
                    onChange={onChange}
                    placeholder={props.placeholder}
                    rows={props.rows ?? 3}
                    value={formData ?? ""}
                    {...inputAttributes}/>
            </Form.Group>
        </ActionDependant>
    );
}

export default TextAreaField;
