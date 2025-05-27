// import styles from "./ReactiveJsonRoot.module.css"
import {EventDispatcherProvider} from "./EventDispatcherProvider.jsx";
import {GlobalDataContextProvider} from "./GlobalDataContextProvider.jsx";
import {TemplateContext} from "./TemplateContext.jsx";
import {View} from "./View.jsx";
import {parseRjBuild} from "./utility/parseRjBuild.jsx";
import {stringToBoolean} from "./utility/stringToBoolean.jsx";
import axios from "axios";
import {load} from 'js-yaml';
import {isEqual} from "lodash";
import {useEffect, useReducer, useState} from 'react';

/**
 * Production ready app root.
 *
 * @param {string} dataFetchMethod The fetch method for the init data. Case-insensitive.
 *     Use "POST" for post. Other values mean "GET".
 * @param {string} dataUrl The URL of the document containing the build data. Either JSON or YAML.
 * @param {{}} headersForData Headers for the data request, such as authentication info.
 * @param {{}} plugins Reactive-JSON plugins.
 * @param {boolean} debugMode Set to true to show the data structure and debug info.
 * @param {React.Element|null} DebugModeContentWrapper Wrapper around the main reactive-json content when in debug mode.
 * @param {React.Element|null} DebugModeDataWrapper Wrapper around the reactive-json debug data when in debug mode.
 * @param {React.Element|null} DebugModeMainWrapper Wrapper around the reactive-json root when in debug mode.
 * @param {string|object} maybeRawAppData A RjBuild to initialize this root with. Can be a string or an object.
 *
 * @returns {JSX.Element}
 *
 * @constructor
 */
export const ReactiveJsonRoot = ({
                                     dataFetchMethod,
                                     dataUrl,
                                     headersForData,
                                     plugins,
                                     debugMode,
                                     DebugModeContentWrapper,
                                     DebugModeDataWrapper,
                                     DebugModeRootWrapper,
                                     maybeRawAppData,
                                 }) => {
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
    const [updatable, setUpdatable] = useState(0);
    const [templates, setTemplates] = useState({});
    const [renderView, setRenderView] = useState({});
    const [items, setItems] = useState([]);
    const [rawAppData, setRawAppData] = useState(() => {
        if (!maybeRawAppData) {
            return undefined;
        }

        if (typeof maybeRawAppData === "string") {
            return maybeRawAppData;
        }

        // Serialize it.
        return JSON.stringify(maybeRawAppData);
    });

    useEffect(() => {
        if (!dataUrl) {
            return;
        }

        if (typeof dataFetchMethod === "string" && dataFetchMethod.toLowerCase() === "post") {
            // TODO: support form data.
            axios.post(
                dataUrl,
                {
                    headers: headersForData,
                })
                .then((res) => {
                    // Note: the data may be already deserialized by axios. It happens when data is JSON.
                    setRawAppData(res.data);
                });
        } else {
            axios.get(
                dataUrl,
                {
                    headers: headersForData,
                })
                .then((res) => {
                    // Note: the data may be already deserialized by axios. It happens when data is JSON.
                    setRawAppData(res.data);
                });
        }
    }, [dataUrl, headersForData]);

    useEffect(() => {
        // TODO: debug to remove.
        console.log("rawAppData");
        console.log(rawAppData);

        if (!rawAppData) {
            // Not yet initialized.
            return;
        }

        let parsedData = parseRjBuild(rawAppData);

        // TODO: debug to remove.
        console.log("parseRjBuild(rawAppData)");
        console.log(parsedData);

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

        // noinspection JSCheckFunctionSignatures
        dispatchCurrentData({type: "setData", "data": parsedData.data});
        setRenderView(parsedData.renderView);
        setItems(Object.keys(parsedData.renderView));
    }, [rawAppData]);

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

    if (!rawAppData) {
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
                    headersForData,
                    plugins,
                    setRawAppData,
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
