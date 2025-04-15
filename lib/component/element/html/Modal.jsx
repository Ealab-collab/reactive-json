import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {dataLocationToPath, evaluateTemplateValue, useEvaluatedAttributes} from "../../../engine/TemplateSystem";
import ActionDependant from "../../../engine/Actions";
import View from "../../../engine/View";
import {useContext, useState} from "react";
import {default as BsModal} from 'react-bootstrap/Modal';

const Modal = ({currentData, path, props}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    // The modal will be opened by default when in state mode.
    const [show, setShow] = useState(true);

    const evaluatedAttrs = useEvaluatedAttributes(props.attributes);

    const {showBoolPath} = props;

    // State mode is when the given bool path is not a path.
    const isInStateMode = typeof showBoolPath !== "string";

    // This is the value which control the modal opening state.
    evaluatedAttrs.show = isInStateMode
        ? show
        : evaluateTemplateValue({
            valueToEvaluate: props?.showBoolPath ?? false, globalDataContext, templateContext
        });

    const handleClose = () => {
        if (isInStateMode) {
            setShow(false);
            return;
        }

        // A bool path is given, this will be used to control the modal visibility.
        const fullPath = dataLocationToPath({
            dataLocation: showBoolPath,
            currentPath: templateContext.templatePath,
            globalDataContext,
            templateContext,
        });

        globalDataContext.updateData(undefined, fullPath);
    };

    // Add the reactive-json class to identify this modal as managed by reactive-json.
    const base = evaluatedAttrs.className ? evaluatedAttrs.className.split(" ") : [];
    base.push("reactive-json");
    evaluatedAttrs.className = base.join(" ");

    return (
        <ActionDependant {...props}>
            <BsModal {...evaluatedAttrs} onHide={handleClose}>
                {(props.headerTitle || props.closeButton) &&
                    <BsModal.Header closeButton={props.closeButton}>
                        <BsModal.Title>
                            <View
                                currentData={currentData?.headerTitle ?? undefined}
                                datafield={"headerTitle"}
                                path={(path ?? "") + ".headerTitle"}
                                props={props?.headerTitle}/>
                        </BsModal.Title>
                    </BsModal.Header>}
                {props.body && <BsModal.Body>
                    <View
                        currentData={currentData?.body ?? undefined}
                        datafield={"body"}
                        path={(path ?? "") + ".body"}
                        props={props?.body}/>
                </BsModal.Body>}
            </BsModal>
        </ActionDependant>
    );
};

export default Modal;
