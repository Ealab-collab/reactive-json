import axios from "axios";
import {dataLocationToPath, evaluateTemplateValue} from "../../../engine/TemplateSystem.jsx";
import {alterData} from "../../../engine/utility/alterData.jsx";

/**
 * Handles the common logic of HTTP requests for fetchData and submitData.
 * 
 * @param {Object} props - The properties of the reaction.
 * @param {Object} props.args - The arguments of the reaction.
 * @param {Object} props.args.refreshAppOnResponse - Tells if the response content will replace the current app content.
 * @param {Object} props.args.updateOnlyData - When true, only update the data instead of replacing the entire RjBuild.
 * @param {Object} props.args.updateDataAtLocation - Specifies where to update the data (like additionalDataSource path).
 * @param {Object} props.args.url - The URL of the request.
 * @param {Object} props.args.data - The data of the request.
 * @param {Object} props.event - The event of the reaction.
 * @param {Object} props.globalDataContext - The global data context.
 * @param {Object} props.templateContext - The template context.
 * @param {Object} requestConfig - Configuration specific to the request.
 * @param {string} requestConfig.method - HTTP method (get, post, etc.).
 * @param {Object} [requestConfig.data] - Data to send (for POST, PUT, etc.).
 * @param {boolean} [requestConfig.submitSilently] - Silent mode.
 * @param {string} errorPrefix - Will be used to identify the caller of this function.
 */
export const executeHttpRequest = (props, requestConfig, errorPrefix = "httpRequest") => {
    // Prevent multiple submits / fetches.
    const reactionEvent = props?.event;

    // Check in realtime if we are already submitting.
    // With this system, only 1 submit can be made concurrently for all roots.
    const body = document.body;

    // TODO: rename the property to reactiveJsonIsSubmitting.
    if (body.dataset.htmlBuilderIsSubmitting === "true") {
        return;
    }

    // This will block any attempts to resubmit until receiving the response.
    body.dataset.htmlBuilderIsSubmitting = "true";

    const submitSilentlyEnabled = typeof requestConfig.submitSilently === "boolean";

    if (submitSilentlyEnabled) {
        // We only work on the submitting silently feature if the property is set and valid.
        if (requestConfig.submitSilently) {
            // This will prevent CSS from visually disabling the fields if true.
            // TODO: rename the property to reactiveJsonIsSubmittingSilently.
            body.dataset.htmlBuilderIsSubmittingSilently = "true";
        } else {
            delete body.dataset.htmlBuilderIsSubmittingSilently;
        }
    }

    /**
     * Clean up the state of the request.
     * 
     * @param {HTMLElement} body - The body of the HTML element.
     * @param {HTMLElement} currentTarget - The target of the reaction.
     */
    const cleanupRequestState = (body, currentTarget) => {
        delete body.dataset.htmlBuilderIsSubmitting;

        if (submitSilentlyEnabled) {
            delete body.dataset.htmlBuilderIsSubmittingSilently;
        }

        if (currentTarget?.dataset) {
            delete currentTarget.dataset.isSubmitting;
        }
    }; 

    const currentTarget = reactionEvent?.currentTarget;

    if (currentTarget?.dataset) {
        // Useful for styling.
        currentTarget.dataset.isSubmitting = "true";
    }

    const {globalDataContext: _globalDataContext, templateContext} = props;

    // Use the root context when submitting data,
    // not the maybe-filtered one that the DataFilter component may have edited.
    // This could be made configurable if ever needed.
    const globalDataContext = _globalDataContext.getRootContext ? 
        _globalDataContext.getRootContext() : _globalDataContext;

    /**
     * Tells if the response content will replace the current app content.
     *
     * @type {boolean}
     */
    const refreshAppOnResponse = props?.args?.refreshAppOnResponse ?? true;

    /**
     * When true, only update the data instead of replacing the entire RjBuild.
     *
     * @type {boolean}
     */
    const updateOnlyData = props?.args?.updateOnlyData ?? false;

    /**
     * Specifies where to update the data (like additionalDataSource path).
     *
     * @type {string|undefined}
     */
    const updateDataAtLocation = props?.args?.updateDataAtLocation;

    const url = evaluateTemplateValue({
        valueToEvaluate: props?.args?.url, 
        globalDataContext, 
        templateContext
    });

    if (!url) {
        cleanupRequestState(body, currentTarget);
        return;
    }

    const headers = globalDataContext.headersForRjBuild ?? {};
    const {setData, setRawAppRjBuild, updateData} = globalDataContext;

    const config = {
        method: requestConfig.method,
        url: url,
        ...(requestConfig.data ? { data: requestConfig.data } : {}),
    };

    if (Object.keys(headers).length > 0) {
        // Override headers only when explicitly set.
        config.headers = headers;
    }

    // Extract dataProcessors from plugins.
    const dataProcessors = globalDataContext.plugins?.dataProcessor || {};

    axios(config)
        .then((value) => {
            if (refreshAppOnResponse) {
                // Create request context for data processors.
                const requestContext = {
                    url: config.url,
                    method: config.method,
                    headers: config.headers || {},
                    body: config.data,
                };

                // Create response context for data processors.
                const responseContext = {
                    headers: value.headers || {},
                    status: value.status,
                    data: value.data
                };

                // Determine if this is an RjBuild response.
                // RjBuild when updateOnlyData is false (meaning we're processing a complete RjBuild).
                // When updateOnlyData is true, we're only processing data.
                const isRjBuild = updateOnlyData === false;

                // Apply data processors to alter the response.
                const alteredResponse = alterData({
                    requestContext,
                    responseContext,
                    responseBody: value.data,
                    isRjBuild,
                    dataProcessors
                });

                if (updateOnlyData) {
                    // Only update the data, not the entire RjBuild.
                    if (!updateDataAtLocation) {
                        // Replace entire data.
                        setData(alteredResponse);
                        return;
                    }

                    // Update at specific location.
                    const evaluatedPath = dataLocationToPath({
                        dataLocation: updateDataAtLocation,
                        currentPath: "data",
                        globalDataContext,
                        templateContext
                    });

                    if (typeof evaluatedPath !== "string" || !evaluatedPath.startsWith("data")) {
                        console.warn(`reactionFunction:${errorPrefix} : updateDataAtLocation evaluation did not result in a valid locationstring:`, updateDataAtLocation, "->", evaluatedPath);
                        return;
                    }

                    if (evaluatedPath === "data") {
                        // The path points to root data, use setData for complete replacement.
                        setData(alteredResponse);
                        return;
                    }

                    updateData(alteredResponse, evaluatedPath);
                    
                } else {
                    // This will trigger a complete re-render.
                    setRawAppRjBuild(alteredResponse);
                }
            }
        })
        .catch((reason) => {
            console.log(`reactionFunction:${errorPrefix} : Could not execute request. Reason: ${reason.message}`);
        })
        .finally(() => {
            cleanupRequestState(body, currentTarget);
        });
};
