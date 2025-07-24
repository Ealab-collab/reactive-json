import {executeHttpRequest} from "./utility/httpRequestCommon.jsx";
import {evaluateTemplateValue} from "../../engine/TemplateSystem.jsx";

/**
 * Submits the current state of this app data.
 *
 * Will reload the app content if refreshAppOnResponse is true.
 *
 * @param {{args: {data, httpMethod, refreshAppOnResponse, submitSilently, url}, event, globalDataContext, templateContext}} props Reaction function props.
 */
export const submitData = (props) => {
    const {globalDataContext: _globalDataContext, templateContext} = props;

    // Use the root context when submitting data,
    // not the maybe-filtered one that the DataFilter component may have edited.
    // This could be made configurable if ever needed.
    const globalDataContext = _globalDataContext.getRootContext
        ? _globalDataContext.getRootContext()
        : _globalDataContext;

    // Prepare the payload of the request.
    let payload = {};

    if (props?.args?.hasOwnProperty("data")) {
        payload = props.args.data;

        // Evaluate the data on the first level.
        const applyFilter = (value, filterFn) => {
            if (Array.isArray(value)) {
                return value.map(filterFn);
            } else if (typeof value === 'object' && value !== null) {
                const entries = Object.entries(value).map(([key, val]) => {
                    return [key, filterFn(val)];
                });

                return Object.fromEntries(
                    entries
                );
            } else {
                return filterFn(value) ? value : null;
            }
        }

        payload = applyFilter(payload, (value) => {
            return evaluateTemplateValue({valueToEvaluate: value, globalDataContext, templateContext})
        });

        if (globalDataContext.templateData.__state !== undefined) {
            // Append the special data.__state value.
            payload.__state = globalDataContext.templateData.__state;
        }
    } else {
        payload.data = globalDataContext.templateData;

        if (globalDataContext.templateData.__state !== undefined) {
            // Append the special data.__state value.
            payload.data.__state = globalDataContext.templateData.__state;
        }
    }

    executeHttpRequest(
        props,
        {
            method: props?.args?.httpMethod ?? "post",
            data: payload,
            submitSilently: props?.args?.submitSilently
        },
        "submitData"
    );
};
