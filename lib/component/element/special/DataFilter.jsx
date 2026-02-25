import { useContext, useEffect, useReducer } from "react";
import { isValid } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { View } from "../../../engine/View.jsx";

/**
 * Use DataFilter to filter data from the global or template data.
 *
 * @param args Component build data.
 *
 * @returns {JSX.Element}
 *
 * @constructor
 */
export const DataFilter = (args) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const templateContexts = { globalDataContext, templateContext };

    // Force re-render for reactive updates in experimental mode.
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const store = globalDataContext?.store;

    const { contextToFilter = "global", filters = [] } = args.props;

    useEffect(() => {
        if (store) {
             // Subscribe to the source of data.
             // If context="global", source is root.
             // If context="template", source is templatePath.
             const path = contextToFilter === "global" ? "" : templateContext.templatePath;
             
             const normalizePath = (p) => {
                 if (!p) return "";
                 if (p === "data") return "";
                 if (p.startsWith("data.")) return p.substring(5);
                 return p;
             };
             const normPath = normalizePath(path);
             
             return store.subscribe(normPath, () => forceUpdate());
        }
    }, [store, contextToFilter, templateContext.templatePath]);

    const filterData = (data) => {
        if (!data) {
            return true;
        }

        for (const filter of filters) {
            const subjectsWithProperty = filter?.subjectsWithProperty ?? undefined;

            if (!subjectsWithProperty) {
                // Ignore this filter.
                continue;
            }

            if (!data.hasOwnProperty(subjectsWithProperty)) {
                continue;
            }

            const additionalConditionHandlers = new Map([
                [
                    "whenFilterableData",
                    ({ condition }) => {
                        // Walk through the data.
                        const path = condition["whenFilterableData"];
                        const pathArray = path.split(".");
                        let current = data;

                        for (const segment of pathArray) {
                            const index = parseInt(segment);
                            current = current[isNaN(index) ? segment : index];
                            if (current === undefined) {
                                return undefined;
                            }
                        }

                        return current;
                    },
                ],
            ]);

            // The item may be filtered out by this filter definition.
            // Now, check the activation conditions.
            if (!isValid(filter, templateContexts, additionalConditionHandlers)) {
                return false;
            }
        }

        // No filter for this data, keep it.
        return true;
    };

    switch (contextToFilter) {
        case "template":
            const newTemplateContext = { ...templateContext };
            newTemplateContext.templateData = cloneAndFilter(templateContext.templateData, filterData);
            newTemplateContext.templatePath = args.path;

            return (
                <TemplateContext.Provider value={newTemplateContext}>
                    <View
                        props={args.props.content}
                        path={args.path + ".content"}
                        datafield={"content"}
                        currentData={args.currentData?.["content"] ?? undefined}
                    />
                </TemplateContext.Provider>
            );

        case "global":
        default:
            // We rewrite the template data.
            const newGlobalDataContext = { ...globalDataContext };
            newGlobalDataContext.templateData = cloneAndFilter(globalDataContext.templateData, filterData);

            return (
                <GlobalDataContext.Provider value={newGlobalDataContext}>
                    <View
                        props={args.props.content}
                        path={args.path + ".content"}
                        datafield={"content"}
                        currentData={args.currentData?.["content"] ?? undefined}
                    />
                </GlobalDataContext.Provider>
            );
    }
};

/**
 * Clones the data to an object only structure.
 *
 * It means that arrays will be converted to objects,
 * with the array indices converted to property keys.
 * This is necessary because we want to preserve the
 * paths of the items that are still appearing after
 * the filtering process, so that they can call
 * updateData as usual.
 *
 * @param data
 * @param {function} filterData
 *
 * @returns {{}|*}
 */
const cloneAndFilter = (data, filterData) => {
    if (Array.isArray(data)) {
        const obj = {};

        data.forEach((item, index) => {
            if (!filterData(item)) {
                // Do not keep this item.
                return;
            }

            obj[index] = cloneAndFilter(item, filterData);
        });

        return obj;
    } else if (typeof data === "object" && data !== null) {
        const obj = {};

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                // We only work with own properties, not inherited ones.
                if (!filterData(data[key])) {
                    // Do not keep this item.
                    continue;
                }

                obj[key] = cloneAndFilter(data[key], filterData);
            }
        }
        return obj;
    } else {
        return data;
    }
};
