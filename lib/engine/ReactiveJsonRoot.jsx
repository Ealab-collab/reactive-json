// import styles from "./ReactiveJsonRoot.module.css"
import {EventDispatcherProvider} from "./EventDispatcherProvider.jsx";
import {GlobalDataContextProvider} from "./GlobalDataContextProvider.jsx";
import {TemplateContext} from "./TemplateContext.jsx";
import {View} from "./View.jsx";
import {parseRjBuild} from "./utility/parseRjBuild.jsx";
import {stringToBoolean} from "./utility/stringToBoolean.jsx";
import {dataLocationToPath} from "./TemplateSystem.jsx";
import axios from "axios";
import {isEqual} from "lodash";
import {useEffect, useReducer, useState} from 'react';

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
                                 }) => {
    // Deprecated properties.
    // TODO: remove these in the next major version.
    const deprecatedProperties = [];

    if (dataFetchMethod) {
        deprecatedProperties.push({deprecatedProperty: "dataFetchMethod", newProperty: "rjBuildFetchMethod"});
        rjBuildFetchMethod = dataFetchMethod;
    }

    if (dataUrl) {
        deprecatedProperties.push({deprecatedProperty: "dataUrl", newProperty: "rjBuildUrl"});
        rjBuildUrl = dataUrl;
    }

    if (headersForData) {
        deprecatedProperties.push({deprecatedProperty: "headersForData", newProperty: "headersForRjBuild"});
        headersForRjBuild = headersForData;
    }

    if (maybeRawAppData) {
        deprecatedProperties.push({deprecatedProperty: "maybeRawAppData", newProperty: "maybeRawAppRjBuild"});
        maybeRawAppRjBuild = maybeRawAppData;
    }

    if (deprecatedProperties.length > 0) {
        // Show a warning in this format: oldValue -> newValue, oldValue -> newValue, ...
        console.warn("A ReactiveJsonRoot component got the following deprecated properties that must be replaced: " + deprecatedProperties.map(p => p.deprecatedProperty + " -> " + p.newProperty).join(", "));
    }

    // End of deprecated properties.

    // Dev note: on PhpStorm, disregard the Function signatures inspection errors of reducers.
    // See: https://youtrack.jetbrains.com/issue/WEB-53963.
    // noinspection JSCheckFunctionSignatures
    const [currentData, dispatchCurrentData] = useReducer((prevState, dispatched) => {
        switch (dispatched.type) {
            case "setData":
                return {updateId: 0, realCurrentData: dispatched.data};

            case "updateData":
                return updateObject(prevState, dispatched.path, dispatched.value, dispatched.updateMode);

            default:
                // Unknown type.
                return prevState;
        }
    }, {updateId: 0, realCurrentData: {}});
    const [templates, setTemplates] = useState({});
    const [renderView, setRenderView] = useState({});
    const [items, setItems] = useState([]);
    const [rawAppRjBuild, setRawAppRjBuild] = useState(() => {
        if (!maybeRawAppRjBuild) {
            return undefined;
        }

        if (typeof maybeRawAppRjBuild === "string") {
            return maybeRawAppRjBuild;
        }

        // Serialize it.
        return JSON.stringify(maybeRawAppRjBuild);
    });

    useEffect(() => {
        if (!rjBuildUrl) {
            return;
        }

        if (typeof rjBuildFetchMethod === "string" && rjBuildFetchMethod.toLowerCase() === "post") {
            // TODO: support form data.
            axios.post(
                rjBuildUrl,
                {
                    headers: headersForRjBuild,
                })
                .then((res) => {
                    // Note: the data may be already deserialized by axios. It happens when data is JSON.
                    setRawAppRjBuild(res.data);
                });
        } else {
            axios.get(
                rjBuildUrl,
                {
                    headers: headersForRjBuild,
                })
                .then((res) => {
                    // Note: the data may be already deserialized by axios. It happens when data is JSON.
                    setRawAppRjBuild(res.data);
                });
        }
    }, [rjBuildUrl, headersForRjBuild]);

    useEffect(() => {
        if (!rawAppRjBuild) {
            // Not yet initialized.
            return;
        }

        let parsedData = parseRjBuild(rawAppRjBuild);

        if (!parsedData?.renderView) {
            // There is no renderView set.
            console.log("Tried to load app data but the content could not be parsed as JSON nor YAML.");
            return;
        }

        // Dev note: listForms is deprecated; will be removed later.
        setTemplates(parsedData.templates ?? parsedData.listForms);

        if (!parsedData.templates && parsedData.listForms) {
            console.log("'listForms' needs to be renamed to 'templates'. The support for 'listForms' will be removed in the next releases of reactive-json.");
        }

        // Apply dataOverride if provided.
        let finalData = dataOverride === undefined ? parsedData.data : dataOverride;

        // Process additionalDataSource if present.
        const additionalDataSource = parsedData.additionalDataSource;

        if (!Array.isArray(additionalDataSource) || additionalDataSource.length === 0) {
            // No additionalDataSource, use data as-is.
            // noinspection JSCheckFunctionSignatures
            dispatchCurrentData({type: "setData", "data": finalData});
            setRenderView(parsedData.renderView);
            setItems(Object.keys(parsedData.renderView));
            return;
        }

        // There are additional data sources to fetch.
        // Create fake temporary contexts for template evaluation.
        // Do not worry too much about these contexts, because each source will use the
        // dispatcher that works with the real final data.
        const globalDataContext = {
            templateData: finalData,
            templatePath: "data",
            headersForRjBuild
        };

        const templateContext = {
            templateData: finalData,
            templatePath: "data"
        };

        // Separate blocking and non-blocking sources.
        const blockingSources = additionalDataSource.filter(source => source.blocking === true);
        const nonBlockingSources = additionalDataSource.filter(source => source.blocking !== true);

        // Fetches a single data source and merges it into the current data.
        const fetchDataSource = async (source, index) => {
            try {
                if (!source.src) {
                    // Ignore this source.
                    console.warn("additionalDataSource item number " + index + " missing 'src' property.", source);
                    return;
                }

                const method = source.method?.toUpperCase() || 'GET';
                const config = {
                    method,
                    url: source.src,
                };

                // Add headers if available.
                if (headersForRjBuild && Object.keys(headersForRjBuild).length > 0) {
                    config.headers = headersForRjBuild;
                }

                const response = await axios(config);
                const fetchedData = response.data;

                // Merge data immediately when this source completes.
                if (!source.path) {
                    // No path specified, merge at root level.
                    if (typeof fetchedData !== 'object' || Array.isArray(fetchedData)) {
                        console.warn("additionalDataSource data cannot be merged at root - must be an object:", fetchedData);
                        return;
                    }

                    // For root level merge, we need to update each property individually
                    // as updateObject does not allow replacing the root object itself.
                    Object.entries(fetchedData).forEach(([key, value]) => {
                        // noinspection JSCheckFunctionSignatures
                        dispatchCurrentData({
                            type: "updateData",
                            path: key,
                            value: value
                        });
                    });

                    return;
                }

                try {
                    // Evaluate the path using template system.
                    const evaluatedPath = dataLocationToPath({
                        dataLocation: source.path,
                        currentPath: "data",
                        globalDataContext,
                        templateContext
                    });

                    if (typeof evaluatedPath !== 'string') {
                        console.warn("additionalDataSource path evaluation did not result in a string:", source.path, "->", evaluatedPath);
                        return;
                    }

                    // Use existing updateObject via updateData.
                    // Remove the "data." prefix from the evaluated path.
                    const dataPath = evaluatedPath.substring("data.".length);

                    // noinspection JSCheckFunctionSignatures
                    dispatchCurrentData({
                        type: "updateData",
                        path: dataPath,
                        value: fetchedData
                    });
                } catch (error) {
                    console.error("Error evaluating additionalDataSource path:", source.path, error);
                }
            } catch (error) {
                // Fail silently but log the error.
                console.error("Error fetching additional data source:", source.src, error);
            }
        };

        // Dispatch initial data immediately.
        // Subsequent fetches using the additionalDataSource will update the data with updateData.
        // noinspection JSCheckFunctionSignatures
        dispatchCurrentData({type: "setData", "data": finalData});

        const processSources = async () => {
            if (blockingSources.length > 0) {
                // Process blocking sources first - use allSettled for robustness.
                const blockingPromises = blockingSources.map((source, index) => fetchDataSource(source, index));

                await Promise.allSettled(blockingPromises).catch((error) => {
                    // Even if some blocking sources fail, we should still render the view.
                    console.error("Error processing blocking additionalDataSource:", error);
                });
            }

            // Now that blocking sources are processed, we can render the view.
            setRenderView(parsedData.renderView);
            setItems(Object.keys(parsedData.renderView));

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
    }, [rawAppRjBuild, dataOverride, headersForRjBuild]);

    const updateData = (newValue, pathInData, updateMode = undefined) => {
        let path = pathInData.replace('data.', '');

        // noinspection JSCheckFunctionSignatures
        dispatchCurrentData({
            type: "updateData",
            path: path,
            value: newValue,
            updateMode: updateMode,
        });
    }

    /**
     * Updates the given data object.
     *
     * This must be a function to be used in the currentData's reducer.
     *
     * @param {{updateId: Number, realCurrentData: {}}} data The current data to edit. It will be mutated.
     *     updateId will increment when a re-render is needed.
     * @param {string} path The path where to put (or remove) the data.
     * @param {any} value The value to set. If undefined, the value will be removed at the given path.
     * @param {string} updateMode The update mode, either "add", "move", "remove", or leave empty for replace.
     *
     * @returns {{updateId: Number, realCurrentData: {}}} Data with update ID changed if a render is needed.
     */
    function updateObject(data, path, value, updateMode = undefined) {
        const splitPath = path.split(".");

        // This will point to the current nested object.
        let pointer = data.realCurrentData;

        for (let i = 0, len = splitPath.length; i < len; i++) {
            const currentNodeKey = splitPath[i];

            if (i === len - 1) {
                // This is the last key from the path.
                if (updateMode === "remove" && Array.isArray(pointer)) {
                    // Remove the entry from the array.
                    pointer.splice(currentNodeKey, 1);
                } else if (updateMode === "move") {
                    // "value" contains the info about how to move.
                    if (value.increment) {
                        // Towards the start of the array.
                        if (!Array.isArray(pointer)) {
                            // Not a valid "up" value. Do nothing.
                            return data;
                        }

                        const newIndex = Math.min(pointer.length, Math.max(0, parseInt(currentNodeKey) + parseInt(value.increment)));

                        if (newIndex === parseInt(currentNodeKey)) {
                            // No changes.
                            return data;
                        }

                        const itemToMove = pointer.splice(currentNodeKey, 1);

                        if (itemToMove.length < 1) {
                            // Nothing to move.
                            return data;
                        }

                        pointer.splice(newIndex, 0, itemToMove[0]);
                    } else {
                        // Nothing to move.
                        return data;
                    }
                } else {
                    if (value === undefined) {
                        // Unset the key.
                        delete pointer[currentNodeKey];
                    } else if (isEqual(value, pointer[currentNodeKey])) {
                        // The value doesn't change.
                        return data;
                    } else {
                        if (updateMode === "add") {
                            // Add the value on the property.
                            if (pointer[currentNodeKey] === undefined) {
                                pointer[currentNodeKey] = [];
                            }

                            pointer[currentNodeKey].push(value);
                        } else {
                            // Set the value on the property.
                            pointer[currentNodeKey] = value;
                        }
                    }
                }

                return {
                    // Using modulo in case of massive update counts in long frontend sessions.
                    updateId: ((data.updateId ?? 0) % (Number.MAX_SAFE_INTEGER - 1)) + 1,
                    realCurrentData: data.realCurrentData
                };
            }

            if (pointer.hasOwnProperty(currentNodeKey)) {
                // The pointer already has the specified key.

                // Dig deeper.
                if (typeof pointer[currentNodeKey] !== "object" || pointer[currentNodeKey] === null) {
                    // Ensure the data is writable.
                    pointer[currentNodeKey] = {};
                }

                // Move the pointer.
                pointer = pointer[currentNodeKey];
                continue;
            }

            // This is a new property.
            pointer[currentNodeKey] = {};
            pointer = pointer[currentNodeKey];
        }

        // This should never happen.
        throw new Error("Could not update data.");
    }

    if (!rawAppRjBuild) {
        return null;
    }

    const rootViews = items.map(view => {
        return (<View
            datafield={view}
            key={view}
            props={renderView[view]}
            path={"data." + view}
            currentData={currentData.realCurrentData?.[view]}/>)
    });

    const debugMode_bool = stringToBoolean(debugMode);

    const mainBuild = (
        <EventDispatcherProvider>
            <GlobalDataContextProvider
                value={{
                    element: templates,
                    headersForRjBuild,
                    plugins,
                    setRawAppRjBuild,
                    templateData: currentData.realCurrentData,
                    templatePath: "data",
                    updateData
                }}>
                <TemplateContext.Provider value={{templateData: currentData.realCurrentData, templatePath: "data"}}>
                    {(debugMode_bool && DebugModeContentWrapper)
                        ? <DebugModeContentWrapper>{rootViews}</DebugModeContentWrapper>
                        : rootViews}
                </TemplateContext.Provider>
                {debugMode_bool
                    ? (DebugModeDataWrapper && <DebugModeDataWrapper>
                        {JSON.stringify(currentData.realCurrentData, null, '  ')}
                    </DebugModeDataWrapper>)
                    : null}
            </GlobalDataContextProvider>
        </EventDispatcherProvider>
    );

    return (debugMode_bool && DebugModeContentWrapper)
        ? <DebugModeRootWrapper>{mainBuild}</DebugModeRootWrapper>
        : mainBuild;
}
