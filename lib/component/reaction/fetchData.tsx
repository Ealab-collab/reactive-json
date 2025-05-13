import axios from "axios";
import {evaluateTemplateValue} from "../../engine/TemplateSystem";

/**
 * Fetches data. Similar to submitData, but for GET requests.
 *
 * Will reload the app content if refreshAppOnResponse is true.
 *
 * @param {{args: {refreshAppOnResponse, url}, event, globalDataContext, templateContext}} props Reaction function props.
 */
export const fetchData = (props) => {
    // Prevent multiple submits / fetches.
    const reactionEvent = props?.event;

    // Check in realtime if we are already submitting.
    // With this system, only 1 submit can be made concurrently for all roots.
    const body = document.body;

    if (body.dataset.htmlBuilderIsSubmitting === "true") {
        return;
    }

    // This will block any attempts to resubmit until receiving the response.
    body.dataset.htmlBuilderIsSubmitting = "true";

    const currentTarget = reactionEvent.currentTarget;

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

    const headers = globalDataContext.headersForData ?? {};

    const {setRawAppData} = globalDataContext;

    axios
        .get(
            url,
            {
                headers
            })
        .then((value) => {
            if (!refreshAppOnResponse) {
                return;
            }

            // This will trigger a complete re-render.
            setRawAppData(value.data);
        })
        .catch((reason) => {
            console.log("reactionFunction:fetchData : Could not fetch. Reason: " + reason.message);
        })
        .finally(() => {
            delete body.dataset.htmlBuilderIsSubmitting;

            if (currentTarget?.dataset) {
                delete currentTarget.dataset.isSubmitting;
            }
        });
};
