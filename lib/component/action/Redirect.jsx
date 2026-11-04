import { useContext } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";
import { isSafeNavigationUrl, warnRefusedNavigation } from "../../engine/utility/markupSecurity.js";

/**
 * Redirects when the conditions are valid.
 *
 * Only http(s) and relative URLs are followed: a javascript: URL would run in the page.
 *
 * @param {{actionProps: {to}}} props Action props.
 *
 * @constructor
 */
export const Redirect = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const { to } = props.actionProps;

    if (!to || typeof to !== "string") {
        return;
    }

    const url = evaluateTemplateValue({ valueToEvaluate: to, globalDataContext, templateContext });

    if (!isSafeNavigationUrl(url)) {
        warnRefusedNavigation("Redirect", url);
        return;
    }

    window.location.href = url;
};
