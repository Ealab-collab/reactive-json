import {executeHttpRequest} from "./utility/httpRequestCommon.jsx";

/**
 * Fetches data using configurable HTTP methods. Similar to submitData, but for data retrieval.
 *
 * Will reload the app content if refreshAppOnResponse is true.
 *
 * @param {{args: {httpMethod, refreshAppOnResponse, updateOnlyData, updateDataAtLocation, url}, event, globalDataContext, templateContext}} props Reaction function props.
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
            method: props?.args?.httpMethod ?? "get"
        },
        "fetchData"
    );
};
