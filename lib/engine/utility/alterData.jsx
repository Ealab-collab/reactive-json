import { cloneDeep } from "lodash";

/**
 * Alters response data using registered data processors.
 *
 * @param {Object} params - The parameters object
 * @param {Object} params.requestContext - Information about the request
 * @param {string} params.requestContext.url - The URL of the request
 * @param {string} params.requestContext.method - The HTTP method
 * @param {Object} params.requestContext.headers - The request headers
 * @param {*} [params.requestContext.body] - The request body (for POST, PUT, etc.)
 * @param {Object} params.responseContext - Information about the response
 * @param {Object} params.responseContext.headers - The response headers
 * @param {Object} params.responseContext.status - The response status
 * @param {Object} params.responseContext.data - The response data
 * @param {*} params.responseBody - The response body to process
 * @param {boolean} [params.isRjBuild=false] - Whether the response is an RjBuild structure
 * @param {Object} params.dataProcessors - Data processors from plugins as an object (already sorted)
 * @returns {*} The altered response body
 */
export const alterData = ({
    requestContext,
    responseContext,
    responseBody,
    isRjBuild = false,
    dataProcessors = {},
}) => {
    if (Object.keys(dataProcessors).length === 0) {
        // No data processors, return original response.
        return responseBody;
    }

    // Clone the response to avoid mutations of the given responseBody.
    const responseBodyClone = cloneDeep(responseBody);

    // Extract the data to process.
    const originalDataToProcess = isRjBuild ? responseBodyClone.data : responseBodyClone;
    let processedData = cloneDeep(originalDataToProcess);

    // Apply each data processor in order (already sorted).
    for (const [processorId, processorConfig] of Object.entries(dataProcessors)) {
        if (typeof processorConfig.callback === "function") {
            try {
                processedData = processorConfig.callback({
                    requestContext,
                    responseContext,
                    dataToProcess: processedData,
                    originalDataToProcess,
                });
            } catch (error) {
                console.error(`Error in dataProcessor "${processorId}":`, error);
                // Continue with other processors even if one fails.
            }
        }
    }

    if (isRjBuild) {
        // Put the processed data back in the appropriate place.
        responseBodyClone.data = processedData;
        return responseBodyClone;
    }

    return processedData;
};
