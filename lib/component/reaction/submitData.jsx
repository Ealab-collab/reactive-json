import axios from "axios";
import {evaluateTemplateValue} from "../../engine/TemplateSystem";

/**
 * Submits the current state of this app data.
 *
 * Will reload the app content if refreshAppOnResponse is true.
 *
 * @param {{args: {data, httpMethod, refreshAppOnResponse, submitSilently, url}, event, globalDataContext, templateContext}} props Reaction function props.
 */
export const submitData = (props) => {
    // Prevent multiple submits.
    const reactionEvent = props?.event;

    // Check in realtime if we are already submitting.
    // With this system, only 1 submit can be made concurrently for all roots.
    const body = document.body;

    if (body.dataset.htmlBuilderIsSubmitting === "true") {
        return;
    }

    // This will block any attempts to resubmit until receiving the response.
    body.dataset.htmlBuilderIsSubmitting = "true";

    if (props?.args?.submitSilently) {
        // This will prevent CSS from visually disabling the fields if true.
        body.dataset.htmlBuilderIsSubmittingSilently = "true";
    } else {
        delete body.dataset.htmlBuilderIsSubmittingSilently;
    }

    const currentTarget = reactionEvent?.currentTarget;

    if (currentTarget?.dataset) {
        // Useful for styling.
        currentTarget.dataset.isSubmitting = "true";
    }

    const {globalDataContext: _globalDataContext, templateContext} = props;

    // Use the root context when submitting data,
    // not the maybe-filtered one that the DataFilter component may have edited.
    // This could be made configurable if ever needed.
    const globalDataContext = _globalDataContext.getRootContext ? _globalDataContext.getRootContext() : _globalDataContext;

    /**
     * Tells if the response content will replace the current app content.
     *
     * @type {boolean}
     */
    const refreshAppOnResponse = props?.args?.refreshAppOnResponse ?? true;

    const url = evaluateTemplateValue({
        valueToEvaluate: props?.args?.url, globalDataContext, templateContext
    });

    if (!url) {
        return;
    }

    let payload = {};

    if (props?.args?.hasOwnProperty("data")) {
        payload = props.args.data;

        // Evaluate the data on the first level.
        function applyFilter(value, filterFn) {
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

    const headers = globalDataContext.headersForData ?? {};

    const {setRawAppData} = globalDataContext;

    const config = {
        method: props?.args?.httpMethod ?? "post",
        url: url,
        data: payload,
    };

    if (headers) {
        // Override headers only when explicitly set.
        config.headers = headers;
    }

    axios(config)
        .then((value) => {
            if (!refreshAppOnResponse) {
                return;
            }

            // This will trigger a complete re-render.
            setRawAppData(value.data);
        })
        .catch((reason) => {
            console.log("reactionFunction:submitData : Could not submit. Reason: " + reason.message);
        })
        .finally(() => {
            delete body.dataset.htmlBuilderIsSubmitting;
            delete body.dataset.htmlBuilderIsSubmittingSilently;

            if (currentTarget?.dataset) {
                delete currentTarget.dataset.isSubmitting;
            }
        });
};
