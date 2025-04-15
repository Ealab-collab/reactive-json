/**
 * Entry point for the lib.
 */
import "bootstrap/dist/css/bootstrap.min.css";

import ReactiveJsonRoot from "./engine/ReactiveJsonRoot.jsx";
import {StrictMode} from "react"
import {createRoot} from "react-dom/client";

export {ReactiveJsonRoot};

document.querySelectorAll("reactive-json").forEach((element) => {
    // Use this to change the fetch method.
    const maybeMethod = element.dataset?.method;

    // Get data included in the root element.
    const headersForData_asElements = element.querySelectorAll("data-source-request-header");
    const headersForData = headersForData_asElements.length ? {} : undefined;

    headersForData_asElements.forEach((headerElement, key, parent) => {
        const headerField = headerElement?.dataset?.headerField;
        const headerValue = headerElement?.dataset?.headerValue;

        if (!headerField || !headerValue) {
            return;
        }

        headersForData[headerField] = headerValue;
    });

    // TODO: Retrieve the reactive-json plugins and inject them in ReactiveJsonRoot.
    createRoot(element).render(
        <StrictMode>
            <ReactiveJsonRoot
                dataFetchMethod={maybeMethod}
                dataUrl={element.dataset.url}
                headersForData={headersForData}
            />
        </StrictMode>,
    );
});
