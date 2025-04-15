import {evaluateTemplateValue} from "../../engine/TemplateSystem";

/**
 * Redirects to the specified URL.
 *
 * @param {{}} props
 */
export const redirectNow = (props) => {
    const {globalDataContext, templateContext} = props;
    const {to} = props.args;

    if (!to || typeof to !== "string") {
        return;
    }

    window.location.href = evaluateTemplateValue({valueToEvaluate: to, globalDataContext, templateContext});
};
