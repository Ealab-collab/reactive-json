import ActionDependant from "../../../engine/Actions";
import View from "../../../engine/View";
import {useEvaluatedAttributes} from "../../../engine/TemplateSystem";

/**
 * Wraps a React Bootstrap component.
 */
function BootstrapElement({props, currentData, path, bsComponent}) {
    const attributes = useEvaluatedAttributes(props.attributes);

    if (props.attributes?.["data-visually-hidden"]) {debugger;}

    if (!bsComponent) {
        return null;
    }

    const BsElement = bsComponent;

    return <ActionDependant {...props}>
        <BsElement {...attributes}>
            {props.content &&
                (<View
                    currentData={currentData.content ?? undefined}
                    datafield={"content"}
                    path={path + ".content"}
                    props={props.content}
                />)}
        </BsElement>
    </ActionDependant>;
}

export default BootstrapElement;
