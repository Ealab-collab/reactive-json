import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { coreComponentsPlugin } from "../coreComponentsPlugin.jsx";
import { mergeComponentCollections } from "./ComponentCollector.jsx";
import { DataStore } from "./DataStore.js";
import { EventDispatcherProvider } from "./EventDispatcherProvider.jsx";
import { GlobalDataContext } from "./GlobalDataContext.jsx";
import ParsingDebugDisplay from "./ParsingDebugDisplay/ParsingDebugDisplay.jsx";
import { StoreContext } from "./StoreContext.jsx";
import { TemplateContext } from "./TemplateContext.jsx";
import { dataLocationToPath } from "./TemplateSystem.jsx";
import { useReactiveData } from "./useReactiveData.js";
import { alterData, applyDataMapping, parseRjBuild } from "./utility";
import { stringToBoolean } from "./utility/stringToBoolean.jsx";
import { View } from "./View.jsx";

/**
 * Internal component to display reactive debug data.
 */
const DebugDataDisplay = ({ Wrapper }) => {
    const data = useReactiveData("");
    return (
        <Wrapper>
            {JSON.stringify(data, null, "  ")}
        </Wrapper>
    );
};

/**
 * Production ready app root.
 *
 * @param {string} rjBuildFetchMethod The fetch method for the init data. Case-insensitive.
 *     Use "POST" for post. Other values mean "GET".
 * @param {string} rjBuildUrl The URL of the document containing the build data. Either JSON or YAML.
 * @param {{}} headersForRjBuild Headers for the data request, such as authentication info.
 * @param {{}} plugins Reactive-JSON plugins.
 * @param {boolean} debugMode Set to true to show the data structure and debug info.
 * @param {React.Element|null} DebugModeContentWrapper Wrapper around the main reactive-json content when in debug mode.
 * @param {React.Element|null} DebugModeDataWrapper Wrapper around the reactive-json debug data when in debug mode.
 * @param {React.Element|null} DebugModeMainWrapper Wrapper around the reactive-json root when in debug mode.
 * @param {string|object} maybeRawAppRjBuild A RjBuild to initialize this root with. Can be a string or an object.
 * @param {{}|undefined} dataOverride Override the data of the retrieved RjBuild with this object.
 * @param {string} dataFetchMethod Deprecated. Use rjBuildFetchMethod instead.
 * @param {string} dataUrl Deprecated. Use rjBuildUrl instead.
 * @param {{}} headersForData Deprecated. Use headersForRjBuild instead.
 * @param {string|object} maybeRawAppData Deprecated. Use maybeRawAppRjBuild instead.
 * @param {Map<string, function>} upstreamUpdateCallbacks Update callbacks to propagate changes to the parent.
 *
 * @returns {JSX.Element}
 *
 * @constructor
 */
export const ReactiveJsonRoot = ({
    dataOverride,
    dataFetchMethod,
    dataUrl,
    debugMode,
    DebugModeContentWrapper,
    DebugModeDataWrapper,
    DebugModeRootWrapper,
    headersForData,
    headersForRjBuild,
    maybeRawAppData,
    maybeRawAppRjBuild,
    plugins,
    rjBuildFetchMethod,
    rjBuildUrl,
    upstreamUpdateCallbacks,
}) => {
    // Deprecated properties.
    // TODO: remove these in the next major version.
    const deprecatedProperties = [];

    if (dataFetchMethod) {
        deprecatedProperties.push({
            deprecatedProperty: "dataFetchMethod",
            newProperty: "rjBuildFetchMethod",
        });
        rjBuildFetchMethod = dataFetchMethod;
    }

    if (dataUrl) {
        deprecatedProperties.push({
            deprecatedProperty: "dataUrl",
            newProperty: "rjBuildUrl",
        });
        rjBuildUrl = dataUrl;
    }

    if (headersForData) {
        deprecatedProperties.push({
            deprecatedProperty: "headersForData",
            newProperty: "headersForRjBuild",
        });
        headersForRjBuild = headersForData;
    }

    if (maybeRawAppData) {
        deprecatedProperties.push({
            deprecatedProperty: "maybeRawAppData",
            newProperty: "maybeRawAppRjBuild",
        });
        maybeRawAppRjBuild = maybeRawAppData;
    }

    if (deprecatedProperties.length > 0) {
        // Show a warning in this format: oldValue -> newValue, oldValue -> newValue, ...
        console.warn(
            "A ReactiveJsonRoot component got the following deprecated properties that must be replaced: " +
                deprecatedProperties.map((p) => p.deprecatedProperty + " -> " + p.newProperty).join(", ")
        );
    }

    // End of deprecated properties.

    // Initialize Store once.
    // We use a ref to hold the store instance.
    const store = useRef(new DataStore({})).current;
    
    // We still need some state to trigger render when the *structure* (RjBuild) changes,
    // but NOT when the *data* changes.
    const [structure, setStructure] = useState({
        templates: {},
        renderView: {},
        items: [],
        rawAppRjBuild: null,
    });

    const [errorPortal, setErrorPortal] = useState(null);
    const errorContainerRef = useRef(null);

    // Cleanup this instance's error container on unmount.
    useEffect(() => {
        return () => {
            if (typeof document !== "undefined" && errorContainerRef.current && errorContainerRef.current.parentNode) {
                errorContainerRef.current.parentNode.removeChild(errorContainerRef.current);
                errorContainerRef.current = null;
            }
        };
    }, []);

    // Merge core plugins with user-provided plugins.
    const mergedPlugins = useMemo(() => 
        plugins ? mergeComponentCollections([coreComponentsPlugin, plugins]) : coreComponentsPlugin,
    [plugins]);

    // Initialize rawAppRjBuild state.
    useEffect(() => {
        let rawBuild = maybeRawAppRjBuild;
        if (typeof rawBuild === "string") {
            // It's a string, already good.
        } else if (rawBuild) {
            rawBuild = JSON.stringify(rawBuild);
        }

        if (rawBuild) {
            setStructure(prev => ({ ...prev, rawAppRjBuild: rawBuild }));
        }
    }, [maybeRawAppRjBuild]);

    // Fetch RjBuild if URL provided.
    useEffect(() => {
        if (!rjBuildUrl) return;

        const config = {
            method: rjBuildFetchMethod || "GET",
            url: rjBuildUrl,
            headers: headersForRjBuild,
        };
        
        if (config.method.toLowerCase() === "post") {
             axios.post(config.url, {}, { headers: config.headers }).then(res => {
                 setStructure(prev => ({ ...prev, rawAppRjBuild: res.data }));
             });
        } else {
             axios.get(config.url, { headers: config.headers }).then(res => {
                 setStructure(prev => ({ ...prev, rawAppRjBuild: res.data }));
             });
        }
    }, [rjBuildUrl, headersForRjBuild, rjBuildFetchMethod]);

    // Parse RjBuild and initialize Store data.
    useEffect(() => {
        if (!structure.rawAppRjBuild) return;

        const processedRjBuild = parseRjBuild(structure.rawAppRjBuild);
        
        if (!processedRjBuild.success) {
            // Failed to parse the RjBuild for this instance.
            console.group(
                `Tried to load the app's RjBuild but the ${processedRjBuild.format} content could not be parsed.`
            );
            console.error(processedRjBuild.error.message);
            console.debug("Context:", {
                rjBuildUrl,
                rjBuildFetchMethod,
                headersForRjBuild,
                maybeRawAppRjBuild,
                dataOverride,
            });
            console.debug("Error details:", processedRjBuild.error);
            console.groupEnd();

            // Create or reuse a global container for parsing errors.
            if (typeof document !== "undefined") {
                let rootContainer = document.getElementById("rj-parsing-error-root");
                if (!rootContainer) {
                    rootContainer = document.createElement("div");
                    rootContainer.id = "rj-parsing-error-root";
                    document.body.appendChild(rootContainer);
                }

                // Create a dedicated container for this instance to support multiple errors safely.
                if (!errorContainerRef.current) {
                    const instanceContainer = document.createElement("div");
                    rootContainer.appendChild(instanceContainer);
                    errorContainerRef.current = instanceContainer;
                }

                setErrorPortal(
                    createPortal(
                        <ParsingDebugDisplay
                            processedRjBuild={processedRjBuild}
                            errorContext={{
                                rjBuildUrl,
                                rjBuildFetchMethod,
                                headersForRjBuild,
                                maybeRawAppRjBuild,
                            }}
                        />,
                        errorContainerRef.current,
                        () => {
                            // Cleanup this instance's error container.
                            if (errorContainerRef.current) {
                                errorContainerRef.current.parentNode.removeChild(errorContainerRef.current);
                                errorContainerRef.current = null;
                            }
                        }
                    )
                );
            }
            return;
        }

        if (errorPortal) {
            // This instance has an error portal, but is no longer in parsing error state.
            // Remove the error portal and its container.
            setErrorPortal(null);

            if (typeof document !== "undefined" && errorContainerRef.current && errorContainerRef.current.parentNode) {
                errorContainerRef.current.parentNode.removeChild(errorContainerRef.current);
                errorContainerRef.current = null;
            }
        }

        const parsedData = processedRjBuild.data;
        
        // Initialize or update Store data.
        // If dataOverride is present, use it.
        const finalData = dataOverride !== undefined ? dataOverride : parsedData.data;
        
        // We set the data in the store. This does NOT trigger a re-render of this component
        // because we are not subscribing to the store here.
        store.set("", finalData); // Root update.

        const newStructure = {
            templates: parsedData.templates ?? parsedData.listForms ?? {},
            renderView: parsedData.renderView ?? {},
            items: Object.keys(parsedData.renderView ?? {}),
            rawAppRjBuild: structure.rawAppRjBuild
        };

        // Process additionalDataSource if present.
        const additionalDataSource = parsedData.additionalDataSource;

        if (!Array.isArray(additionalDataSource) || additionalDataSource.length === 0) {
            setStructure(prev => ({ ...prev, ...newStructure }));
            return;
        }

        // Separate blocking and non-blocking sources.
        const blockingSources = additionalDataSource.filter((source) => source.blocking === true);
        const nonBlockingSources = additionalDataSource.filter((source) => source.blocking !== true);

        // Helper to strip "data." prefix from path
        const normalizePath = (p) => {
            if (!p) return "";
            if (p === "data") return "";
            if (p.startsWith("data.")) return p.substring(5);
            return p;
        };

        // Fetches a single data source and merges it into the current data.
        const fetchDataSource = async (source, index) => {
            try {
                if (!source.src) {
                    // Ignore this source.
                    console.warn("additionalDataSource item number " + index + " missing 'src' property.", source);
                    return;
                }

                const method = source.method?.toUpperCase() || "GET";
                const config = {
                    method,
                    url: source.src,
                };

                // Add headers if available.
                if (headersForRjBuild && Object.keys(headersForRjBuild).length > 0) {
                    config.headers = headersForRjBuild;
                }

                const response = await axios(config);

                // Create request context for data processors.
                const requestContext = {
                    url: config.url,
                    method: config.method,
                    headers: config.headers || {},
                    body: config.data,
                };

                // Create response context for data processors.
                const responseContext = {
                    headers: response.headers || {},
                    status: response.status,
                    data: response.data,
                };

                // Apply data processors to alter the response.
                const fetchedData = alterData({
                    requestContext,
                    responseContext,
                    responseBody: response.data,
                    // additionalDataSource always processes raw data, not RjBuild.
                    isRjBuild: false,
                    dataProcessors: mergedPlugins?.dataProcessor || {},
                });

                if (source.dataMapping) {
                    // Creating fake temporary contexts for template evaluation.
                    // We use the store getter for templateData
                    // Do not worry too much about these contexts, because each source will use the
                    // dispatcher that works with the real final data.
                    const globalDataContext = {
                        headersForRjBuild,
                        plugins: mergedPlugins,
                        get templateData() { return store.get(""); },
                        templatePath: "data",
                        setData: (newData) => store.set("", newData),
                        updateData: (val, path, mode) => {
                            const cleanPath = normalizePath(path);
                            store.set(cleanPath, val, mode);
                        },
                    };

                    const templateContext = {
                        get templateData() { return store.get(""); },
                        templatePath: "data",
                    };

                    try {
                        applyDataMapping({
                            dataMapping: source.dataMapping,
                            responseData: fetchedData,
                            globalDataContext,
                            templateContext,
                        });

                        // When dataMapping is used (successfully or with a fallback),
                        // we don't continue with the traditional path logic.
                        return;
                    } catch (error) {
                        console.error("Error applying dataMapping for additionalDataSource:", error);
                        // Continue with traditional logic on error
                    }
                }

                // Merge data immediately when this source completes.
                if (!source.path) {
                    // No path specified, merge at root level.
                    if (typeof fetchedData !== "object" || Array.isArray(fetchedData)) {
                        console.warn(
                            "additionalDataSource data cannot be merged at root - must be an object:",
                            fetchedData
                        );
                        return;
                    }

                    // For root level merge, we need to update each property individually
                    // as updateObject does not allow replacing the root object itself.
                    Object.entries(fetchedData).forEach(([key, value]) => {
                        store.set(key, value);
                    });

                    return;
                }

                try {
                    // Create contexts for evaluation
                    const globalDataContext = {
                        templateData: store.get(""), // use current snapshot
                        templatePath: "data"
                    };
                    const templateContext = {
                        templateData: store.get(""), // use current snapshot
                        templatePath: "data"
                    };

                    // Evaluate the path using template system.
                    const evaluatedPath = dataLocationToPath({
                        dataLocation: source.path,
                        currentPath: "data",
                        globalDataContext,
                        templateContext,
                    });

                    if (typeof evaluatedPath !== "string") {
                        console.warn(
                            "additionalDataSource path evaluation did not result in a string:",
                            source.path,
                            "->",
                            evaluatedPath
                        );
                        return;
                    }

                    // Remove the "data." prefix.
                    const dataPath = normalizePath(evaluatedPath);

                    store.set(dataPath, fetchedData);
                } catch (error) {
                    console.error("Error evaluating additionalDataSource path:", source.path, error);
                }
            } catch (error) {
                // Fail silently but log the error.
                console.error("Error fetching additional data source:", source.src, error);
            }
        };

        const processSources = async () => {
            if (blockingSources.length > 0) {
                // Process blocking sources first - use allSettled for robustness.
                const blockingPromises = blockingSources.map((source, index) => fetchDataSource(source, index));
                await Promise.allSettled(blockingPromises);
            }

            setStructure(prev => ({ ...prev, ...newStructure }));

            if (nonBlockingSources.length > 0) {
                // Process non-blocking sources in background.
                const nonBlockingPromises = nonBlockingSources.map((source, index) =>
                    fetchDataSource(source, blockingSources.length + index)
                );

                // Non-blocking sources don't need to be awaited.
                Promise.allSettled(nonBlockingPromises);
            }
        };
        
        processSources();

    }, [structure.rawAppRjBuild, dataOverride, store]);

    // Functions to expose in Context.
    // These are stable references.
    
    /**
     * Handles upstream update callbacks and returns true if an upstream callback was used.
     *
     * @param {string} path The path without "data." prefix
     * @param {any} newValue The value to update
     * @param {string} updateMode The update mode
     * @returns {boolean} True if an upstream callback handled the update, false otherwise
     */
    function tryUpstreamUpdate(path, newValue, updateMode) {
        if (!upstreamUpdateCallbacks || upstreamUpdateCallbacks.size === 0) {
            return false;
        }

        // Upstream update callbacks have been set. Let's check if there is one
        // that matches the path to update.
        for (const [pathInDataOverride, upstreamCallback] of upstreamUpdateCallbacks) {
            // Check if the updated path matches or is a sub-path of pathInDataOverride.
            // "pathInDataOverride" does not contain the "data." prefix.
            if (path === pathInDataOverride || path.startsWith(pathInDataOverride + ".") || pathInDataOverride === "") {
                // The value to update is located in a template reference of the parent rjBuild.
                // Calculate the relative path from pathInDataOverride.
                const relativePath = pathInDataOverride === "" ? path : path.substring(pathInDataOverride.length + 1);

                try {
                    // Use the upstream callback instead of updating locally.
                    upstreamCallback(newValue, relativePath, updateMode);
                    return true; // Upstream callback handled the update.
                } catch (error) {
                    console.warn("Error during upstream update:", error);
                    // Continue with local update in case of error.
                    break;
                }
            }
        }

        return false;
    }

    const setData = (newData) => {
        // Try upstream update first (for root data replacement)
        if (tryUpstreamUpdate("", newData, undefined)) {
            return; // Upstream callback handled it
        }
        store.set("", newData);
    };

    const updateData = (val, path, mode) => {
        const cleanPath = path.startsWith("data.") ? path.substring(5) : (path === "data" ? "" : path);
        
        // Try upstream update first
        if (tryUpstreamUpdate(cleanPath, val, mode)) {
            return; // Upstream callback handled it
        }

        store.set(cleanPath, val, mode);
    };

    // Context Value for GlobalDataContext.
    // IMPORTANT: We do NOT include 'templateData' here to prevent re-renders.
    // Components must use useReactiveData or store.get() to access data.
    const globalContextValue = {
        element: structure.templates,
        headersForRjBuild,
        plugins: mergedPlugins,
        ReactiveJsonRoot: ReactiveJsonRoot,
        setData,
        updateData,
        // experimental: expose store for advanced usage
        store, 
        // fallback: get data from store directly (non-reactive access)
        get templateData() { return store.get(""); },
        templatePath: "data",
    };

    const rootViews = structure.items.map((view) => (
        <View
            key={view}
            datafield={view}
            path={"data." + view}
            props={structure.renderView[view]}
            // No currentData passed! View fetches it.
        />
    ));

    const debugMode_bool = stringToBoolean(debugMode);

    return (
        <StoreContext.Provider value={store}>
            <EventDispatcherProvider>
                <GlobalDataContext.Provider value={globalContextValue}>
                     <TemplateContext.Provider value={{
                         // Same here, getter for compatibility, but won't trigger updates
                         get templateData() { return store.get(""); },
                         templatePath: "data"
                     }}>
                        {debugMode_bool && DebugModeContentWrapper ? (
                            <DebugModeRootWrapper>
                                <DebugModeContentWrapper>{rootViews}</DebugModeContentWrapper>
                                {DebugModeDataWrapper && (
                                    <DebugDataDisplay Wrapper={DebugModeDataWrapper} />
                                )}
                                {errorPortal}
                            </DebugModeRootWrapper>
                        ) : (
                            <>
                                {rootViews}
                                {errorPortal}
                            </>
                        )}
                    </TemplateContext.Provider>
                </GlobalDataContext.Provider>
            </EventDispatcherProvider>
        </StoreContext.Provider>
    );
};
