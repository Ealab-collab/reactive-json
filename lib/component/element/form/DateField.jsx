import {useContext, useRef} from "react";
import {Form} from "react-bootstrap";
import {ActionDependant} from "../../../engine/Actions.jsx";
import {useEvaluatedAttributes} from "../../../engine/TemplateSystem.jsx";
import {GlobalDataContext} from "../../../engine/GlobalDataContext.jsx";
import {TemplateContext} from "../../../engine/TemplateContext.jsx";
import {View} from "../../../engine/View.jsx";
import {propsDataLocationToPathAndValue} from "./formElementsCommon.jsx";

export const DateField = (componentProps) => {
    // TODO: type date & datetime-local support.
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const mainAttributesHolderRef = useRef(null);

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

    return <ActionDependant {...props} attributesHolderRef={mainAttributesHolderRef}>
        <Form.Group {...attributes} ref={mainAttributesHolderRef} controlId={Math.random().toString()}>
            {props.label && <Form.Label>
                <View
                    currentData={componentProps.currentData?.["label"] ?? undefined}
                    datafield={"label"}
                    path={componentProps.path + ".label"}
                    props={props.label}/>
            </Form.Label>}
            <Form.Control onChange={onChange} type={"datetime-local"} value={formData ?? ""}/>
        </Form.Group>
    </ActionDependant>;
};
