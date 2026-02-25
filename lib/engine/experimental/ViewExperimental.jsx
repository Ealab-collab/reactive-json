import { useContext, useEffect, useReducer, useSyncExternalStore, useMemo, useCallback } from "react";
import { GlobalDataContext } from "../GlobalDataContext.jsx";
import { TemplateContext } from "../TemplateContext.jsx";
import { useStore } from "./StoreContext.jsx";
import TemplateValue, { dataLocationToPath } from "../TemplateSystem.jsx";

const normalizePath = (p) => {
    if (!p) return "";
    if (p === "data") return "";
    if (p.startsWith("data.")) return p.substring(5);
    return p;
};

export const ViewExperimental = ({ props, datafield, path }) => {
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
        return null;
    }

    const { element } = globalDataContext;
    
    // Fallback for undefined data
    const safeCurrentData = currentData === undefined ? "" : currentData;

    if (props?.type) {
        let ComponentToRender = components[props.type] ?? undefined;
        const maybeHtmlComponent = components.Html;

        if (ComponentToRender === undefined) {
            ComponentToRender = maybeHtmlComponent;
        }

        if (!ComponentToRender) {
            return null;
        }

        if (maybeHtmlComponent === ComponentToRender) {
            // Note: modifying props directly is bad practice but follows existing pattern
            // Ideally copy props first.
            if (!props.tag) props.tag = props.type;
        }

        return <ComponentToRender path={path} props={props} currentData={safeCurrentData} datafield={datafield} />;
    }

    // Load logic
    if (props?.load) {
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
                console.error("ViewExperimental: Error evaluating customDataLocation", e);
                finalDataPath = path;
             }
        } else {
            finalDataPath = path;
        }

        // This external source can return a single component to render,
        // or a collection of components.
        if (typeof props.load === "function") {
             // Not supported in basic implementation for now as it requires passing currentData to function
             // and expecting synchronous return.
             // But we can support it if we pass the current snapshot.
             loadedRenderArray = props.load(safeCurrentData);
        } else {
            // Load the render array from the registry.
            loadedRenderArray = element[props.load];
        }

        // Override any values of the registry render array with the current render array,
        // without the properties specific to the "load" method.
        const { load, customDataLocation, ...propsWithoutLoadKey } = props;
        loadedRenderArray = { ...loadedRenderArray, ...propsWithoutLoadKey };

        // For the child view, we need to provide a new TemplateContext because the path might have changed (customDataLocation).
        // Also, for non-reactive components (like ActionDependant isValid), we provide the getter-based templateData.
        // CRITICAL FIX: templateData must point to the data AT the new path, NOT the root.
        // But since we can't reliably resolve the full object path in a getter without parsing,
        // and evaluateTemplateValue expects templateData to be the object at templatePath...
        
        // Wait, templateData IS the object at templatePath.
        // So we need to resolve it.
        const childTemplateContext = useMemo(() => ({
            templatePath: finalDataPath,
            get templateData() { 
                const normalized = normalizePath(finalDataPath);
                return store.get(normalized); 
            }
        }), [finalDataPath, store]);

        return (
            <TemplateContext.Provider value={childTemplateContext}>
                <ViewExperimental
                    datafield={datafield}
                    path={finalDataPath}
                    props={loadedRenderArray}
                />
            </TemplateContext.Provider>
        );
    }

    // Recursive rendering
    if (Array.isArray(props)) {
        return props.map((item, index) => (
            <ViewExperimental
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
                <ViewExperimental
                    key={path + "." + itemKey}
                    path={path + "." + itemKey}
                    datafield={itemKey ?? undefined}
                    props={item}
                />
            );
        });
    }

    return <TemplateValue valueToEvaluate={safeCurrentData || (props ?? null)} />;
};
