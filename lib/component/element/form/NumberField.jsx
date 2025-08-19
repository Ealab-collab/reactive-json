import {useContext, useRef} from 'react';
import {Form} from 'react-bootstrap';
import {ActionDependant} from "../../../engine/Actions.jsx";
import {GlobalDataContext} from "../../../engine/GlobalDataContext.jsx";
import {TemplateContext} from "../../../engine/TemplateContext.jsx";
import {useEvaluatedAttributes, evaluateTemplateValue} from "../../../engine/TemplateSystem.jsx";
import {View} from "../../../engine/View.jsx";
import {propsDataLocationToPathAndValue} from "./formElementsCommon.jsx";

export const NumberField = ({props, datafield, path, currentData}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const mainAttributesHolderRef = useRef(null);

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

    const maybePlaceholder = evaluateTemplateValue({
        valueToEvaluate: props.placeholder,
        globalDataContext,
        templateContext
    });

    const onChange = (e) => {
        globalDataContext.updateData(e.currentTarget.value, formDataPath);
    };

    return (
        <ActionDependant {...props} attributesHolderRef={mainAttributesHolderRef}>
            <Form.Group {...attributes} ref={mainAttributesHolderRef} controlId={Math.random().toString()}>
                {props.label && <Form.Label>
                    <View
                        currentData={currentData?.["label"] ?? undefined}
                        datafield={"label"}
                        path={path + ".label"}
                        props={props.label}/>
                </Form.Label>}
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