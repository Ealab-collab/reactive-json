import {Accordion as BsAccordion} from "react-bootstrap";
import View from "../../../engine/View";
import {useEvaluatedAttributes} from "../../../engine/TemplateSystem";
import ActionDependant from "../../../engine/Actions";

/**
 * To use with the BsAccordion component.
 *
 * To use this, use the BsAccordion component, and add
 * AccordionItem in the content.
 *
 * You can of course use the Switch component to map to
 * dynamic data.
 */
const AccordionItem = ({props, path, currentData, datafield}) => {
    const attributes = useEvaluatedAttributes(props.attributes);

    return <ActionDependant {...props}>
        <BsAccordion.Item {...attributes} eventKey={datafield} key={datafield}>
            {props?.header
                ? <BsAccordion.Header>
                    <View
                        props={props.header}
                        path={path + ".header"}
                        currentData={currentData?.["header"]}
                        datafield={"header"}/>
                </BsAccordion.Header>
                : null}
            {props?.body
                ? <BsAccordion.Body>
                    <View
                        props={props.body}
                        path={path + ".body"}
                        currentData={currentData?.["body"]}
                        datafield={"body"}/>
                </BsAccordion.Body>
                : null}
        </BsAccordion.Item>
    </ActionDependant>;
}

export default AccordionItem;
