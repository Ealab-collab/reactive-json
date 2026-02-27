import { useContext, useEffect, useRef, useCallback } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { useStore } from "../../../engine/StoreContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { dataLocationToPath } from "../../../engine/TemplateSystem.jsx";
import axios from "axios";
import { isEqual } from "lodash";

/**
 * Strips the "data." prefix from a path resolved by dataLocationToPath,
 * since the DataStore uses paths without this prefix.
 */
const toStorePath = (rawPath) => {
    if (rawPath === "data") return "";
    if (rawPath && rawPath.startsWith("data.")) return rawPath.substring(5);
    return rawPath;
};

export const DataSync = ({ props }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const store = useStore();

    const lastAttemptedDataRef = useRef(undefined);
    const lastServerResponseRef = useRef(null);
    const timeoutRef = useRef(null);
    const retryTimeoutRef = useRef(null);
    const isSyncingRef = useRef(false);
    const retryCountRef = useRef(0);

    const mode = props.mode || 'onIdle';
    const idleDelay = props.idleDelay || 1000;
    const maxRetries = props.maxRetries ?? 0;
    const retryDelay = props.retryDelay ?? 5000;

    // Resolve the absolute path to the data object
    let resolvedPath = null;
    try {
        resolvedPath = toStorePath(dataLocationToPath({
            dataLocation: props.path,
            currentPath: templateContext.templatePath,
            globalDataContext,
            templateContext,
        }));
    } catch (e) {
        console.error("DataSync: Invalid path", props.path, e);
    }

    // Resolve trigger path (works in any mode)
    let triggerPath = null;
    if (props.trigger) {
        try {
            triggerPath = toStorePath(dataLocationToPath({
                dataLocation: props.trigger,
                currentPath: templateContext.templatePath,
                globalDataContext,
                templateContext,
            }));
        } catch (e) {
            console.error("DataSync: Invalid trigger path", props.trigger, e);
        }
    }

    const performSync = useCallback(async (currentObject) => {
        if (!currentObject || !currentObject.submission_url) {
            if (currentObject) {
                console.warn("DataSync: Missing submission_url in data object", currentObject);
            }
            return;
        }

        if (isSyncingRef.current) return;

        // Check retry limit: first attempt is always allowed,
        // retryCount tracks additional attempts after the first.
        if (retryCountRef.current > maxRetries) {
            return;
        }

        isSyncingRef.current = true;
        retryCountRef.current++;

        // Remember the data we are attempting to sync
        lastAttemptedDataRef.current = currentObject.data;

        store.set(`${resolvedPath}.status`, {
            type: "info",
            // TODO: translate this.
            message: "Synchronisation en cours..."
        });

        try {
            const { submission_url } = currentObject;
            const response = await axios.post(submission_url, currentObject);
            const responseData = response.data;

            lastServerResponseRef.current = responseData;
            // Reset retry count on success
            retryCountRef.current = 0;

            store.set(resolvedPath, responseData);
        } catch (error) {
            console.error("DataSync error:", error);

            const serverBody = error.response?.data;

            if (serverBody && typeof serverBody === "object" && serverBody.status) {
                lastServerResponseRef.current = serverBody;
                retryCountRef.current = 0;
                store.set(resolvedPath, serverBody);
                isSyncingRef.current = false;
                return;
            }

            const errorStatus = {
                type: "error",
                message: error.message || "Unknown error"
            };

            store.set(`${resolvedPath}.status`, errorStatus);

            // Only retry on genuine network outages or server errors (5xx).
            // CORS failures also produce no error.response, but the browser is online,
            // so we use navigator.onLine to distinguish them from real network issues.
            const isServerError = error.response && error.response.status >= 500;
            const isNetworkOutage = !error.response && typeof navigator !== "undefined" && !navigator.onLine;
            const isRetryable = isServerError || isNetworkOutage;

            if (isRetryable && retryCountRef.current <= maxRetries) {
                retryTimeoutRef.current = setTimeout(() => {
                    const freshObject = store.get(resolvedPath);
                    performSync(freshObject);
                }, retryDelay);
            }
        } finally {
            isSyncingRef.current = false;
        }
    }, [store, resolvedPath, maxRetries]);

    // Watch for data changes
    useEffect(() => {
        if (!store || resolvedPath === null) return;

        const handleDataChange = () => {
            const currentObject = store.get(resolvedPath);
            if (!currentObject) return;

            // Loop Prevention: ignore if the whole object is the server response
            if (currentObject === lastServerResponseRef.current) {
                return;
            }

            // Ignore if only non-data fields changed (e.g. status update)
            // by comparing the .data field with what we last attempted or received
            const currentData = currentObject.data;

            if (lastAttemptedDataRef.current !== undefined && isEqual(currentData, lastAttemptedDataRef.current)) {
                return;
            }

            if (lastServerResponseRef.current && isEqual(currentData, lastServerResponseRef.current.data)) {
                return;
            }

            // User made a real data change: reset retry count and cancel pending retry
            retryCountRef.current = 0;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }

            if (mode === 'immediate') {
                performSync(currentObject);
            } else if (mode === 'onIdle') {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    performSync(currentObject);
                }, idleDelay);
            }
        };

        const unsubscribe = store.subscribe(resolvedPath, handleDataChange);
        return () => {
            unsubscribe();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, [store, resolvedPath, mode, idleDelay, performSync]);

    // Watch for manual trigger (works in any mode)
    useEffect(() => {
        if (!store || triggerPath === null) return;

        const handleTriggerChange = () => {
            const shouldSync = store.get(triggerPath);
            if (shouldSync === true) {
                store.set(triggerPath, false);

                // Cancel any pending idle timer
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                retryCountRef.current = 0;

                const currentObject = store.get(resolvedPath);
                performSync(currentObject);
            }
        };

        const unsubscribe = store.subscribe(triggerPath, handleTriggerChange);
        return () => unsubscribe();
    }, [store, triggerPath, resolvedPath, performSync]);

    return (
        <ActionDependant {...props}>
            {/* DataSync is a phantom component */}
        </ActionDependant>
    );
};
