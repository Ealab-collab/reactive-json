/**
 * Action which will append a popover when the current component is hovered.
 */

import {OverlayTrigger, Popover as BsPopover} from "react-bootstrap";
import View from "../../engine/View";
import {useEvaluatedAttributes} from "../../engine/TemplateSystem";
import {useRef} from "react";

const Popover = (props) => {
    // We use the React Bootstrap Popover component. It works like the Tooltip component.
    // It requires an OverlayTrigger wrapping component that handles the hover interaction.
    // The OverlayTrigger child must be able to get a "ref" (as in react refs),
    // So we wrap the children in a custom HTML tag (popover-reference) to be sure it will work.
    const bodyAttrs = useEvaluatedAttributes(props.actionProps.bodyAttributes || {});
    const headerAttrs = useEvaluatedAttributes(props.actionProps.headerAttributes || {});

    // This ref is used to help building complex structures like popovers inside modals.
    // Without this, the popover will show behind the modal instead of being in front.
    // It is usually expected to have the popover over the modal, but if we don't want
    // this effect for a specific case, we should make this configurable to not set
    // the ref.
    const containerRef = useRef(null);

    return <div ref={containerRef}>
        <OverlayTrigger
            container={containerRef}
            placement={props.actionProps.placement ?? "top"}
            trigger={props.actionProps.trigger ?? "click"}
            overlay={<BsPopover>
                {props.actionProps.header && <BsPopover.Header {...headerAttrs}>
                    <View
                        props={props.actionProps.header}
                        currentData={props.componentProps?.currentData?.actions?.[props.actionIndex]?.header ?? undefined}
                        datafield={"header"}
                        path={props.componentProps.path + ".actions." + props.actionIndex + ".header"}
                    />
                </BsPopover.Header>}
                <BsPopover.Body {...bodyAttrs}>
                    <View
                        props={props.actionProps.body}
                        currentData={props.componentProps?.currentData?.actions?.[props.actionIndex]?.body ?? undefined}
                        datafield={"body"}
                        path={props.componentProps.path + ".actions." + props.actionIndex + ".body"}
                    />
                </BsPopover.Body>
            </BsPopover>}>
            <popover-reference>{props.children}</popover-reference>
        </OverlayTrigger>
    </div>;
};

export default Popover;
