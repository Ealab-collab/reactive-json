import { useContext, useEffect, useRef, useCallback } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { useStore } from "../../../engine/StoreContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { dataLocationToPath } from "../../../engine/TemplateSystem.jsx";
import {
    joinSyncGroup as coreJoinSyncGroup,
    broadcastToGroup as coreBroadcastToGroup,
    getOwner as coreGetOwner,
} from "../../utility/dataSyncGroups.js";
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

    // Shared-syncable coordination registry, resolved as a `utility` plugin so an
    // app can substitute JUST the group management (its own registry) without
    // overriding this whole component. Falls back to the core singleton.
    const { joinSyncGroup, broadcastToGroup, getOwner } =
        globalDataContext.plugins?.utility?.dataSyncGroups ?? {
            joinSyncGroup: coreJoinSyncGroup,
            broadcastToGroup: coreBroadcastToGroup,
            getOwner: coreGetOwner,
        };

    const lastAttemptedDataRef = useRef(undefined);
    const lastServerResponseRef = useRef(null);
    // Identity (item_url) of the syncable last seen. When it appears or changes,
    // the object arrived FROM the server (initial async load, refetch, or a
    // re-seed bringing the management URLs) — its data is a baseline, not a user
    // edit, so it must not be POSTed straight back.
    const lastItemUrlRef = useRef(undefined);
    const timeoutRef = useRef(null);
    const retryTimeoutRef = useRef(null);
    const isSyncingRef = useRef(false);
    const retryCountRef = useRef(0);
    const eventTargetRef = useRef(null);
    const performSyncRef = useRef(null);

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

    // Shared-syncable ("merge") grouping. When `mergeKey` resolves to a stable
    // identity (e.g. the submission_url), every DataSync yielding the same value
    // forms a group with a single owner-writer: a real edit on one is broadcast
    // to the others (mirrored into their store, echo-suppressed → live, no
    // re-POST) and persistence is delegated to the owner — so concurrent edits
    // on different members coalesce into one correct write. Unset = no grouping.
    let mergeKeyValue = null;
    if (props.mergeKey && store) {
        try {
            mergeKeyValue = store.get(toStorePath(dataLocationToPath({
                dataLocation: props.mergeKey,
                currentPath: templateContext.templatePath,
                globalDataContext,
                templateContext,
            })));
        } catch (e) { /* unresolved yet — joins once available */ }
    }
    const mergeKeyRef = useRef(null);
    mergeKeyRef.current = mergeKeyValue;

    const memberRef = useRef(null);
    if (memberRef.current === null) {
        memberRef.current = {
            // Apply remote data into our store, suppressing our own change-watcher
            // (no re-broadcast, no POST) — a live mirror of a sibling's edit.
            applyRemote: (data) => {
                if (resolvedPath === null) return;
                lastAttemptedDataRef.current = data;
                const cur = store.get(resolvedPath) || {};
                store.set(resolvedPath, { ...cur, data });
            },
            // Owner-only: (re)schedule the single debounced POST, reading the
            // LATEST shared data at fire time (never a stale captured object).
            requestSync: () => {
                if (resolvedPath === null) return;
                if (mode === 'immediate') {
                    performSyncRef.current?.(store.get(resolvedPath));
                    return;
                }
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    performSyncRef.current?.(store.get(resolvedPath));
                }, idleDelay);
            },
        };
    }

    // Join/leave the group when the resolved key appears or changes.
    useEffect(() => {
        if (!mergeKeyValue || resolvedPath === null) return;
        return joinSyncGroup(mergeKeyValue, memberRef.current);
    }, [mergeKeyValue, resolvedPath]);

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

            // Mirror the authoritative server data (enriched) to sibling syncables.
            if (mergeKeyRef.current) {
                broadcastToGroup(mergeKeyRef.current, memberRef.current, responseData?.data);
            }

            eventTargetRef.current?.dispatchEvent(new CustomEvent("syncSuccess", {
                bubbles: true,
                detail: { value: responseData, responseContext: { status: response.status } }
            }));
        } catch (error) {
            console.error("DataSync error:", error);

            const serverBody = error.response?.data;

            if (serverBody && typeof serverBody === "object" && serverBody.status) {
                lastServerResponseRef.current = serverBody;
                retryCountRef.current = 0;
                store.set(resolvedPath, serverBody);

                eventTargetRef.current?.dispatchEvent(new CustomEvent("syncError", {
                    bubbles: true,
                    detail: { value: serverBody, responseContext: { status: error.response?.status } }
                }));

                isSyncingRef.current = false;
                return;
            }

            const errorStatus = {
                type: "error",
                message: error.message || "Unknown error"
            };

            store.set(`${resolvedPath}.status`, errorStatus);

            eventTargetRef.current?.dispatchEvent(new CustomEvent("syncError", {
                bubbles: true,
                detail: { value: serverBody, responseContext: { status: error.response?.status } }
            }));

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

    // Keep the member's requestSync() pointed at the latest performSync.
    performSyncRef.current = performSync;

    // Watch for data changes
    useEffect(() => {
        if (!store || resolvedPath === null) return;

        // Baseline the identity AND data already present at subscribe time, so a
        // syncable whose data is set synchronously at mount isn't mistaken for a
        // server reload on its first genuine user edit, and an equal re-seed
        // (parent re-render re-evaluating a subroot's dataOverride) is ignored.
        const initialObject = store.get(resolvedPath);
        if (initialObject) {
            lastItemUrlRef.current = initialObject.item_url ?? initialObject.submission_url;
            lastAttemptedDataRef.current = initialObject.data;
        }

        const handleDataChange = () => {
            const currentObject = store.get(resolvedPath);
            if (!currentObject) return;

            // Loop Prevention: ignore if the whole object is the server response
            if (currentObject === lastServerResponseRef.current) {
                return;
            }

            const currentData = currentObject.data;

            // Server-origin (re)load: when the syncable's identity (item_url, or
            // submission_url as a fallback) just appeared or changed, the data
            // came FROM the server — not from a user edit. Baseline it without
            // syncing. This prevents a freshly async-loaded syncable (e.g. one
            // fetched into a subroot) from POSTing itself back on mount, which
            // would otherwise fire during page load (often before CSRF is ready).
            const currentItemUrl = currentObject.item_url ?? currentObject.submission_url;
            if (currentItemUrl !== lastItemUrlRef.current) {
                lastItemUrlRef.current = currentItemUrl;
                lastAttemptedDataRef.current = currentData;
                return;
            }

            // Ignore if only non-data fields changed (e.g. status update)
            // by comparing the .data field with what we last attempted or received
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

            // Shared-syncable group: mirror the edit live to siblings (echo-
            // suppressed), then delegate persistence to the single OWNER, which
            // (re)schedules its one debounced POST reading the LATEST data. This
            // makes rapid alternating edits on different members coalesce into a
            // single correct write — no concurrent writers, no stale-data POST.
            if (mergeKeyRef.current) {
                broadcastToGroup(mergeKeyRef.current, memberRef.current, currentData);
                const owner = getOwner(mergeKeyRef.current) || memberRef.current;
                owner.requestSync();
                return;
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
        <ActionDependant {...props} attributesHolderRef={eventTargetRef}>
            <span ref={eventTargetRef} style={{display: 'none'}} />
        </ActionDependant>
    );
};
