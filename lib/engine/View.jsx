import { useContext, useEffect, useReducer, useSyncExternalStore, useMemo, useCallback } from "react";
import { GlobalDataContext } from "./GlobalDataContext.jsx";
import { TemplateContext } from "./TemplateContext.jsx";
import { useStore } from "./StoreContext.jsx";
import TemplateValue, { dataLocationToPath } from "./TemplateSystem.jsx";

const normalizePath = (p) => {
    if (!p) return "";
    if (p === "data") return "";
    if (p.startsWith("data.")) return p.substring(5);
    return p;
};

export const View = ({ props, datafield, path }) => {
    const store = useStore();
    const globalDataContext = useContext(GlobalDataContext);
    // Note: TemplateContext might be needed for path resolution, even if data is stale.
    const templateContext = useContext(TemplateContext);
    
    // Force update reducer.
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    const normalizedPath = normalizePath(path);
    // 1. Reactive Data Subscription for the View's own data (path).
    // Use useSyncExternalStore to avoid tearing and race conditions.
    const currentData = useSyncExternalStore(
        (callback) => store.subscribe(normalizedPath, callback),
        () => store.get(normalizedPath)
    );

    // 2. Scan props for other dependencies (e.g. ~~.config.theme) and subscribe to them.
    // This is a naive implementation that only checks direct string properties.
    // A full implementation would traverse the object.
    const dependencyPaths = useMemo(() => {
        if (!props || typeof props !== 'object') return [];

        const dependencies = [];
        
        const scan = (obj) => {
            if (!obj) return;
            if (typeof obj === 'string') {
                if (obj.startsWith("~.") || obj.startsWith("~~.") || obj.startsWith("~>") || obj.startsWith("~~>")) {
                    try {
                        const depPath = dataLocationToPath({
                            dataLocation: obj,
                            currentPath: path,
                            globalDataContext: { templatePath: "data" }, // minimal context
                            templateContext: { templatePath: path } // minimal context
                        });
                        if (depPath && depPath !== path) {
                             dependencies.push(normalizePath(depPath));
                        }
                    } catch (e) {
                        // ignore resolution errors
                    }
                }
            } else if (typeof obj === 'object') {
                Object.values(obj).forEach(val => scan(val));
            }
        };
        
        scan(props);
        return [...new Set(dependencies)];
    }, [props, path]);

    const subscribeDeps = useCallback((callback) => {
        const unsubscribes = dependencyPaths.map(depPath => 
            store.subscribe(depPath, callback)
        );
        return () => unsubscribes.forEach(u => u());
    }, [dependencyPaths, store]);

    const getDepsSnapshot = useCallback(() => {
        const values = dependencyPaths.map(depPath => store.get(depPath));
        return JSON.stringify(values);
    }, [dependencyPaths, store]);

    useSyncExternalStore(subscribeDeps, getDepsSnapshot);

    // ... Standard View Logic ...
    
    // Get available elements from merged plugins.
    const plugins = globalDataContext.plugins ?? {};
    const components = plugins?.element ?? {};

    if (!components) {
        // No available elements.
        return null;
    }

    const { element } = globalDataContext;
    
    // Fallback for undefined data
    const safeCurrentData = currentData === undefined ? "" : currentData;

    if (props?.type) {
        // A type is specified.
        // First, try to find a component matching the given type by name.
        let ComponentToRender = components[props.type] ?? undefined;
        const maybeHtmlComponent = components.Html;

        if (ComponentToRender === undefined) {
            // Use the Html component as fallback from plugins.
            ComponentToRender = maybeHtmlComponent;
        }

        if (!ComponentToRender) {
            // The requested component is not available, nor is the Html fallback component.
            console.warn(`No component found for type "${props.type}" and no Html fallback available.`);
            return null;
        }

        if (maybeHtmlComponent === ComponentToRender) {
            // Either the user has specifically asked for a Html component,
            // or this is a fallback for an unknown type.
            // Make sure the tag is set.
            if (!props.tag) props.tag = props.type;
        }

        return <ComponentToRender path={path} props={props} currentData={safeCurrentData} datafield={datafield} />;
    }

    if (props?.load) {
        // An external render source must be loaded.
        let loadedRenderArray;

        const _customDataLocation = props?.customDataLocation ?? undefined;

        // Note: For evaluation, we use the store getter for templateData,
        // but we rely on the reactive nature of this component for updates.
        // If _customDataLocation depends on data, this component should have already subscribed to it via dependency scanning.

        // Determine which data path to use.
        let finalDataPath;
        if (_customDataLocation) {
             try {
                finalDataPath = dataLocationToPath({
                  dataLocation: _customDataLocation,
                  currentPath: path,
                  globalDataContext: { templatePath: "data", get templateData() { return store.get(""); } },
                  templateContext: { templatePath: path, get templateData() { return store.get(""); } },
                });
             } catch (e) {
                console.error("View: Error evaluating customDataLocation", e);
                finalDataPath = path;
             }
        } else {
            finalDataPath = path;
        }

        // This external source can return a single component to render,
        // or a collection of components.
        if (typeof props.load === "function") {
            // A JS function has been defined. Execute it with the currentData.
            // The function must return a render array.
            loadedRenderArray = props.load(safeCurrentData);
        } else {
            // Load the render array from the registry.
            loadedRenderArray = element[props.load];
        }

        // Override any values of the registry render array with the current render array,
        // without the properties specific to the "load" method.
        const { load, customDataLocation, ...propsWithoutLoadKey } = props;
        loadedRenderArray = { ...loadedRenderArray, ...propsWithoutLoadKey };

        const viewToRender = (
            <View
                datafield={datafield}
                path={finalDataPath}
                props={loadedRenderArray}
            />
        );

        if (props.keepTemplateContext) {
            return viewToRender;
        }

        // For the child view, we need to provide a new TemplateContext because the path might have changed (customDataLocation).
        // Also, for non-reactive components (like ActionDependant isValid), we provide the getter-based templateData.
        const childTemplateContext = {
            templatePath: finalDataPath,
            get templateData() { 
                const normalized = normalizePath(finalDataPath);
                return store.get(normalized); 
            }
        };

        return (
            <TemplateContext.Provider value={childTemplateContext}>
                {viewToRender}
            </TemplateContext.Provider>
        );
    }

    // Try to go deeper to render something.
    if (Array.isArray(props)) {
        return props.map((item, index) => (
            <View
                key={path + "." + index}
                path={path + "." + index}
                datafield={index}
                props={item ?? undefined}
            />
        ));
    }

    if (typeof props === "object") {
        return Object.entries(props).map(([itemKey, item]) => {
            return (
                <View
                    key={path + "." + itemKey}
                    path={path + "." + itemKey}
                    datafield={itemKey ?? undefined}
                    props={item}
                />
            );
        });
    }

    // Display the content directly.
    // The content tries to use the safeCurrentData in case the data wants to rewrite the output.
    // If not available, we simply use the given props, which is usually a string, which can
    // also be a reference to a template context data.
    // If no props is available, do not render anything.
    return <TemplateValue valueToEvaluate={safeCurrentData || (props ?? null)} />;
}
