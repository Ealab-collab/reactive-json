import {evaluateTemplateValue} from "../../engine/TemplateSystem.jsx";
import {useContext} from "react";
import {GlobalDataContext} from "../../engine/GlobalDataContext.jsx";
import {TemplateContext} from "../../engine/TemplateContext.jsx";

/**
 * Redirects when the conditions are valid.
 *
 * @param {{actionProps: {to}}} props Action props.
 *
 * @constructor
 */
export const Redirect = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const {to} = props.actionProps;

    if (!to || typeof to !== "string") {
        return;
    }

    window.location.href = evaluateTemplateValue({valueToEvaluate: to, globalDataContext, templateContext});
};
