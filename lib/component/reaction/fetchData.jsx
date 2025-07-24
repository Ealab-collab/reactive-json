import {executeHttpRequest} from "./utility/httpRequestCommon.jsx";

/**
 * Fetches data using configurable HTTP methods. Similar to submitData, but for data retrieval.
 *
 * Will reload the app content if refreshAppOnResponse is true.
 *
 * @param {{args: {httpMethod, refreshAppOnResponse, url}, event, globalDataContext, templateContext}} props Reaction function props.
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
