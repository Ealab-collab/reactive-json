import {evaluateTemplateValue} from "../../engine/TemplateSystem";
import {useContext} from "react";
import GlobalDataContext from "../../engine/GlobalDataContext";
import TemplateContext from "../../engine/TemplateContext";

/**
 * Redirects when the conditions are valid.
 *
 * @param {{actionProps: {to}}} props Action props.
 *
 * @constructor
 */
const Redirect = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const {to} = props.actionProps;

    if (!to || typeof to !== "string") {
        return;
    }

    window.location.href = evaluateTemplateValue({valueToEvaluate: to, globalDataContext, templateContext});
};

export default Redirect;
