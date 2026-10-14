import { evaluateTemplateValue, interpolateSegmentsInContext } from "../../engine/TemplateSystem.jsx";

/**
 * Redirects to the specified URL.
 *
 * The `to` argument is a string (a URL or a template reference), or an array of segments
 * built like the `src` of additionalDataSource (see interpolateSegmentsInContext).
 * Nothing happens when the URL is empty, or aborted by a required segment.
 *
 * With `replace: true`, the current history entry is replaced instead of adding a new one.
 *
 * @param {{}} props
 */
export const redirectNow = (props) => {
    const { globalDataContext, templateContext } = props;
    const { replace, to } = props.args;

    let url;

    if (Array.isArray(to)) {
        url = interpolateSegmentsInContext({ segments: to, globalDataContext, templateContext });
    } else if (to && typeof to === "string") {
        url = evaluateTemplateValue({ valueToEvaluate: to, globalDataContext, templateContext });
    }

    if (url === undefined || url === null || url === "") {
        return;
    }

    if (replace === true) {
        window.location.replace(String(url));
        return;
    }

    window.location.href = String(url);
};
