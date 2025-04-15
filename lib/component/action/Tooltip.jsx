/**
 * Action which will append a tooltip when the current component is hovered.
 */

import {OverlayTrigger, Tooltip as BsTooltip} from "react-bootstrap";
import View from "../../engine/View";

const Tooltip = (props) => {
    // We use the React Bootstrap Tooltip component.
    // It requires an OverlayTrigger wrapping component that handles the hover interaction.
    // The OverlayTrigger child must be able to get a "ref" (as in react refs),
    // So we wrap the children in a custom HTML tag (tooltip-reference) to be sure it will work.
    return <OverlayTrigger
        placement={props.actionProps.placement ?? "top"}
        overlay={<BsTooltip>
            <View
                props={props.actionProps.content}
                currentData={props.componentProps?.currentData?.actions?.[props.actionIndex] ?? undefined}
                datafield={props.actionIndex}
                path={props.componentProps.path + ".actions." + props.actionIndex}
            />
        </BsTooltip>}>
        <tooltip-reference>{props.children}</tooltip-reference>
    </OverlayTrigger>;
};

export default Tooltip;
