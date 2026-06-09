import axios from "axios";
import { dataLocationToPath, evaluateTemplateValue } from "../../../engine/TemplateSystem.jsx";
import { alterData, applyDataMapping } from "../../../engine/utility";

/**
 * Per-key registry of in-flight AbortControllers. Shared across all
 * reaction calls so a later request can cancel an earlier one that
 * declared the same `requestKey`. Module-scoped on purpose — there's
 * only one set of HTTP reactions per page.
 */
const inflightByKey = new Map();

/**
 * Detects an axios/fetch abort error (cancellation) regardless of the
 * specific shape thrown by the runtime. Newer axios uses CanceledError
 * with code ERR_CANCELED ; AbortController on the platform throws an
 * AbortError. We accept all three.
 */
const isAbortError = (reason) =>
    (typeof axios.isCancel === "function" && axios.isCancel(reason)) ||
    reason?.name === "CanceledError" ||
    reason?.name === "AbortError" ||
    reason?.code === "ERR_CANCELED";

/**
 * Handles the common logic of HTTP requests for fetchData and submitData.
 *
 * @param {Object} props - The properties of the reaction.
 * @param {Object} props.args - The arguments of the reaction.
 * @param {boolean} [props.args.allowConcurrent] - When true, allows concurrent requests (bypasses the global lock). Default: false. Implicitly true when `requestKey` is set, since per-key cancel-on-new already provides single-flight within a key.
 * @param {Object} [props.args.data] - Data to send (for POST, PUT, etc.). Should be not provided for GET requests.
 * @param {Object} props.args.dataMapping - Configuration for selective data dispatch using mapping processors.
 * @param {Object} props.args.refreshAppOnResponse - Tells if the response content will replace the current app content.
 * @param {string} [props.args.requestKey] - Identifier used to group requests that should cancel each other. When set, firing a new request with the same key aborts the previous one client-side (axios AbortController). Different keys are independent. Absent → upstream behavior (global lock applies unless allowConcurrent is set).
 * @param {boolean} [props.args.submitSilently] - Silent mode. When true, prevents CSS from visually disabling the fields.
 * @param {Object} props.args.updateOnlyData - When true, only update the data instead of replacing the entire RjBuild.
 * @param {Object} props.args.updateDataAtLocation - Specifies where to update the data (like additionalDataSource path).
 * @param {Object} props.args.url - The URL of the request.
 * @param {Object} props.event - The event of the reaction.
 * @param {Object} props.globalDataContext - The global data context.
 * @param {Object} props.templateContext - The template context.
 * @param {Object} requestConfig - Configuration specific to the request.
 * @param {string} requestConfig.method - HTTP method (get, post, etc.).
 * @param {Object} [requestConfig.data] - Data to send (for POST, PUT, etc.).
 * @param {string} errorPrefix - Will be used to identify the caller of this function.
 */
export const executeHttpRequest = (props, requestConfig, errorPrefix = "httpRequest") => {
    // .eventData is more reliable than .event because it's not reset by React even in async conditions.
    const reactionEvent = props?.eventData;

    // Prevent multiple submits / fetches.
    // Check in realtime if we are already submitting.
    // With this system, only 1 submit can be made concurrently for all roots.
    const body = document.body;

    // A non-empty requestKey opts the call into per-key cancel-on-new
    // semantics. It's mutually exclusive with the global lock — a key'd
    // request is allowed to coexist with other key'd requests AND with
    // non-key'd ones, because the per-key registry is what enforces
    // single-flight within a key.
    const requestKey = typeof props?.args?.requestKey === "string" && props.args.requestKey.length > 0
        ? props.args.requestKey
        : null;

    // Check if concurrent requests are allowed (default: false for backward compatibility).
    // `requestKey` implies concurrency because per-key cancel-on-new
    // already provides single-flight within the key.
    const allowConcurrent = props?.args?.allowConcurrent === true || requestKey !== null;

    // Only check and set the lock if concurrent requests are not allowed
    if (!allowConcurrent) {
        // TODO: rename the property to reactiveJsonIsSubmitting.
        if (body.dataset.htmlBuilderIsSubmitting === "true") {
            return;
        }

        // This will block any attempts to resubmit until receiving the response.
        body.dataset.htmlBuilderIsSubmitting = "true";
    }

    const submitSilentlyEnabled = typeof props?.args?.submitSilently === "boolean";

    if (submitSilentlyEnabled) {
        // We only work on the submitting silently feature if the property is set and valid.
        if (props?.args?.submitSilently) {
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
     * @param {boolean} allowConcurrent - Whether concurrent requests are allowed.
     */
    const cleanupRequestState = (body, currentTarget, allowConcurrent) => {
        // Only clean up the global lock if we set it (i.e., concurrent requests were not allowed)
        if (!allowConcurrent) {
            delete body.dataset.htmlBuilderIsSubmitting;
        }

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

    const { globalDataContext: _globalDataContext, templateContext } = props;

    // Use the root context when submitting data,
    // not the maybe-filtered one that the DataFilter component may have edited.
    // This could be made configurable if ever needed.
    const globalDataContext = _globalDataContext.getRootContext
        ? _globalDataContext.getRootContext()
        : _globalDataContext;

    /**
     * Configuration for selective data dispatch using mapping processors.
     *
     * @type {Object|undefined}
     */
    const dataMapping = props?.args?.dataMapping;

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
        templateContext,
    });

    if (!url) {
        cleanupRequestState(body, currentTarget, allowConcurrent);
        return;
    }

    const headers = globalDataContext.headersForRjBuild ?? {};
    const { setData, setRawAppRjBuild, updateData } = globalDataContext;

    const config = {
        method: requestConfig.method,
        url: url,
        ...(requestConfig.data ? { data: requestConfig.data } : {}),
    };

    if (Object.keys(headers).length > 0) {
        // Override headers only when explicitly set.
        config.headers = headers;
    }

    // Per-key cancel-on-new : abort any in-flight request sharing this
    // key, register ours, and pass its signal to axios. The previous
    // request's .catch will fire with AbortError and silently exit ;
    // its .finally will skip the `response` event dispatch.
    let controller = null;
    if (requestKey) {
        const previous = inflightByKey.get(requestKey);
        if (previous) {
            previous.abort();
        }
        controller = new AbortController();
        inflightByKey.set(requestKey, controller);
        config.signal = controller.signal;
    }

    // Extract dataProcessors from plugins.
    const dataProcessors = globalDataContext.plugins?.dataProcessor || {};

    // Request context for data processors.
    let requestContext = {
        url: config.url,
        method: config.method,
        headers: config.headers || {},
        body: config.data,
    };

    // Response context for data processors.
    let responseContext = null;

    // Response that will be altered by data processors.
    let alteredResponse = null;

    // Determine if this is an RjBuild response.
    // RjBuild when updateOnlyData is false (meaning we're processing a complete RjBuild).
    // When updateOnlyData is true, we're only processing data.
    const isRjBuild = updateOnlyData === false;

    // Tracks whether THIS call ended with an abort. Set in .catch so
    // .finally can skip the `response` event dispatch — the successor
    // request that aborted us will fire its own event.
    let wasAborted = false;

    axios(config)
        .then((value) => {
            // Create response context for data processors.
            responseContext = {
                headers: value.headers || {},
                status: value.status,
                data: value.data,
            };

            alteredResponse = alterData({
                requestContext,
                responseContext,
                responseBody: value.data,
                isRjBuild,
                dataProcessors,
            });

            if (refreshAppOnResponse) {
                if (updateOnlyData) {
                    if (dataMapping) {
                        try {
                            // A data mapping has been supplied.
                            applyDataMapping({
                                dataMapping,
                                responseData: alteredResponse,
                                globalDataContext,
                                templateContext,
                            });

                            // If dataMapping is used, we don't continue with the traditional updateDataAtLocation logic
                            return;
                        } catch (error) {
                            console.error(`reactionFunction:${errorPrefix} : Error applying dataMapping:`, error);

                            // Don't continue with the traditional updateDataAtLocation logic
                            // even if updateDataAtLocation is set.
                            // Using dataMapping means that we don't use updateDataAtLocation.
                            return;
                        }
                    }

                    // Only update the data, not the entire RjBuild.
                    if (!updateDataAtLocation) {
                        // Replace entire data.
                        // TODO: when updateData works at the root, we can use it here with updateMode.
                        setData(alteredResponse);
                        return;
                    }

                    // Update at specific location.
                    const evaluatedPath = dataLocationToPath({
                        dataLocation: updateDataAtLocation,
                        currentPath: "data",
                        globalDataContext,
                        templateContext,
                    });

                    if (typeof evaluatedPath !== "string" || !evaluatedPath.startsWith("data")) {
                        console.warn(
                            `reactionFunction:${errorPrefix} : updateDataAtLocation evaluation did not result in a valid locationstring:`,
                            updateDataAtLocation,
                            "->",
                            evaluatedPath
                        );
                        return;
                    }

                    if (evaluatedPath === "data") {
                        // The path points to root data, use setData for complete replacement.
                        setData(alteredResponse);
                        return;
                    }

                    // TODO: support updateMode.
                    updateData(alteredResponse, evaluatedPath);
                } else {
                    // This will trigger a complete re-render.
                    setRawAppRjBuild(alteredResponse);
                }
            }
        })
        .catch((reason) => {
            if (isAbortError(reason)) {
                // Intentional cancel by a successor request sharing the
                // same `requestKey`. Don't surface as an error and don't
                // dispatch a response event — the successor will.
                wasAborted = true;
                return;
            }

            console.log(`reactionFunction:${errorPrefix} : Could not execute request. Reason: ${reason.message}`);

            responseContext = {
                headers: reason?.response?.headers || {},
                status: reason?.response?.status || 500,
                data: reason?.response?.data || null,
            };

            alteredResponse = alterData({
                requestContext,
                responseContext,
                responseBody: reason?.response?.data || null,
                isRjBuild,
                dataProcessors,
            });
        })
        .finally(() => {
            // Release the registry slot only if we still own it. A new
            // request with the same key may have already replaced us.
            if (requestKey && inflightByKey.get(requestKey) === controller) {
                inflightByKey.delete(requestKey);
            }

            cleanupRequestState(body, currentTarget, allowConcurrent);

            if (wasAborted) {
                // Skip dispatch — see comment in .catch above.
                return;
            }

            const event = new CustomEvent("response", {
                bubbles: false,
                cancelable: true,
                composed: true,
                detail: { requestContext, value: alteredResponse, responseContext },
            });

            console.log(`reactionFunction:${errorPrefix} : Dispatching event: response`, event);
            console.log("currentTarget", currentTarget);
            currentTarget?.dispatchEvent(event);
        });
};
