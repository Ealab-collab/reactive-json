import {useContext} from 'react';
import { VariablesDebug } from '../component';
import {FolderSortableTree} from "../component/element/html/FolderSortableTree.jsx";
import {FormatNumeral} from "../component/element/html/FormatNumeral.jsx";
import {Html} from "../component/element/html/Html.jsx";
import {LabelFromValue} from "../component/element/html/LabelFromValue.jsx";
import {PreformattedMarkup} from "../component/element/html/PreformattedMarkup.jsx";
import {SortableTreeItemCollapseButton} from "../component/element/html/SortableTreeItemCollapseButton.jsx";
import {Count} from "../component/element/special/Count.jsx";
import {DataFilter} from "../component/element/special/DataFilter.jsx";
import {DelayedActions} from "../component/element/special/DelayedActions.jsx";
import {PageControls} from "../component/element/special/PageControls.jsx";
import {Phantom} from "../component/element/special/Phantom.jsx";
import {ReactiveJsonSubroot} from "../component/element/special/ReactiveJsonSubroot.jsx";
import {Switch} from "../component/element/special/Switch.jsx";
import {GlobalDataContext} from "./GlobalDataContext.jsx";
import {TemplateContext} from "./TemplateContext.jsx";
import TemplateValue, {dataLocationToPath, evaluateTemplateValue} from "./TemplateSystem.jsx";

export function View({props, currentData, datafield, path}) {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const plugins = globalDataContext.plugins ?? {};

    const components = {
        Count,
        DataFilter,
        DelayedActions,
        FolderSortableTree,
        FormatNumeral,
        Html,
        LabelFromValue,
        PageControls,
        Phantom,
        PreformattedMarkup,
        ReactiveJsonSubroot,
        SortableTreeItemCollapseButton,
        Switch,
        VariablesDebug,
        ...plugins?.element,
    };

    const {element} = globalDataContext;

    if (currentData === undefined) {
        currentData = "";
    }

    if (props?.type) {
        // A type is specified.
        // First, try to find a component matching the given type by name.
        let ComponentToRender = components[props.type] ?? undefined;

        if (ComponentToRender === undefined) {
            // Use the Html component as fallback.
            ComponentToRender = Html;
        }

        if (Html === ComponentToRender) {
            // Either the user has specifically asked for a Html component,
            // or this is a fallback for an unknown type.
            // Make sure the tag is set.
            props.tag = props.tag ?? props.type;
        }

        return <ComponentToRender
            path={path}
            props={props}
            currentData={currentData}
            datafield={datafield}/>;
    }

    if (props?.load) {
        // An external render source must be loaded.
        let loadedRenderArray;

        const _customDataLocation = props?.customDataLocation ?? undefined;

        // Determine which data to use.
        const finalCurrentData = _customDataLocation
            // The data is located somewhere in the current data.
            ? evaluateTemplateValue({
                globalDataContext: globalDataContext,
                templateContext: templateContext,
                valueToEvaluate: _customDataLocation,
            })
            // The data is the current data.
            : currentData;

        // The data path must be set accordingly.
        const finalDataPath = _customDataLocation
            ? dataLocationToPath({dataLocation: _customDataLocation, currentPath: path, globalDataContext, templateContext})
            : path;

        // This external source can return a single component to render,
        // or a collection of components.
        if (typeof props.load === "function") {
            // A JS function has been defined. Execute it with the currentData.
            // The function must return a render array.
            loadedRenderArray = props.load(finalCurrentData);
        } else {
            // Load the render array from the registry.
            loadedRenderArray = element[props.load];
        }

        // Override any values of the registry render array with the current render array,
        // without the properties specific to the "load" method.
        const {load, customDataLocation, ...propsWithoutLoadKey} = props;
        loadedRenderArray = {...loadedRenderArray, ...propsWithoutLoadKey};

        // Now that we have our render array, recurse on the View component.
        if (props.keepTemplateContext) {
            // Keep the current template context.
            return (
                <View
                    currentData={finalCurrentData}
                    datafield={datafield}
                    path={finalDataPath}
                    props={loadedRenderArray}
                />
            );
        }

        // We open a new template context in the process.
        return (
            <TemplateContext.Provider value={{templateData: finalCurrentData, templatePath: finalDataPath}}>
                <View
                    currentData={finalCurrentData}
                    datafield={datafield}
                    path={finalDataPath}
                    props={loadedRenderArray}
                />
            </TemplateContext.Provider>
        );
    }

    // Try to go deeper to render something.
    if (Array.isArray(props)) {
        return props.map((item, index) =>
            <View
                currentData={currentData[index] ?? undefined}
                datafield={index}
                key={path + "." + index}
                path={path + "." + index}
                props={item ?? undefined}
            />
        );
    }

    if (typeof props === "object") {
        return Object.entries(props).map(([itemKey, item]) => {
                return <View
                    currentData={currentData[itemKey] ?? undefined}
                    datafield={itemKey ?? undefined}
                    key={path + "." + itemKey}
                    path={path + "." + itemKey}
                    props={item}
                />
            }
        );
    }

    // Display the content directly.
    // The content tries to use the currentData in case the data wants to rewrite the output.
    // If not available, we simply use the given props, which is usually a string, which can
    // also be a reference to a template context data.
    // If no props is available, do not render anything.
    return <TemplateValue valueToEvaluate={currentData || (props ?? null)}/>;
}
