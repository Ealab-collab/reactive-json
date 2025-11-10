import { executeHttpRequest } from "./utility/httpRequestCommon.jsx";

/**
 * Fetches data using configurable HTTP methods. Similar to submitData, but for data retrieval.
 *
 * Will reload the app content if refreshAppOnResponse is true.
 *
 * @param {{args: {allowConcurrent, dataMapping, httpMethod, refreshAppOnResponse, updateOnlyData, updateDataAtLocation, url}, event, globalDataContext, templateContext}} props Reaction function props.
 * @param {Object} props.args - The arguments of the reaction.
 * @param {boolean} [props.args.allowConcurrent=false] When true, allows concurrent requests (bypasses the global lock).
 * @param {*} [props.args.data] Data to send (for POST, PUT, etc.). Should be not provided for GET requests.
 * @param {Object} [props.args.dataMapping] Configuration for selective data dispatch using mapping processors.
 * @param {string} [props.args.httpMethod="get"] HTTP method to use for the request.
 * @param {boolean} [props.args.refreshAppOnResponse=true] Whether to refresh the app content with the response.
 * @param {boolean} [props.args.updateOnlyData=false] When true, only update the data instead of replacing the entire RjBuild.
 * @param {string} [props.args.updateDataAtLocation] Specifies where to update the data (like additionalDataSource path).
 * @param {string} props.args.url URL to fetch data from.
 */
export const fetchData = (props) => {
    executeHttpRequest(
        props,
        {
            method: props?.args?.httpMethod ?? "get",
        },
        "fetchData"
    );
};
