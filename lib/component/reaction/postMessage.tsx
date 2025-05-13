import {evaluateTemplateValueCollection} from "../../engine/TemplateSystem";

/**
 * Posts a message to the specified target.
 *
 * @param {{args: {includeChangedValue, message, messageTarget, on, targetOrigin}, event, globalDataContext, templateContext}} props
 */
export const postMessage = (props) => {
    const messageTargets = {
        parent: window.parent,
        self: window,
    };

    const messageTarget = messageTargets[props?.args?.messageTarget ?? "parent"] ?? window;

    // The targetOrigin must match the schema and domain where the message will be sent.
    // Otherwise, the message will be discarded for security reasons.
    // When not set, the target will be the current location's origin by default.
    const messageTargetOrigin = props?.args?.targetOrigin ?? window.location.origin;

    const message_evaluated = evaluateTemplateValueCollection({
        globalDataContext: props.globalDataContext,
        templateContext: props.templateContext,
        valueToEvaluate: props?.args?.message
    });

    if (props?.args?.on === "change" && typeof message_evaluated === "object" && props?.args?.includeChangedValue && props?.event?.target?.nodeName === "INPUT") {
        let changedValue;

        switch (props?.event?.target?.type) {
            case "checkbox":
                changedValue = props?.event?.target?.checked;
                break;

            default:
            // TODO: support other types.
        }

        message_evaluated["changedValue"] = changedValue;
    }

    (messageTarget && messageTargetOrigin) && messageTarget.postMessage(message_evaluated, messageTargetOrigin);
};
