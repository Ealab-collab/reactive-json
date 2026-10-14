import { dataLocationToPath, evaluateTemplateValue, isTemplateValue } from "../TemplateSystem.jsx";

/**
 * Gets the path and the data for the specified dataLocation and contexts.
 *
 * @param {string} currentPath The current path of the component calling this function.
 * @param {string} datafield The datafield (field name) of the component calling this function.
 * @param {string|undefined} dataLocation The dataLocation value set in the component structure.
 * @param {any} defaultValue The default value set in the component structure.
 * @param {{}} globalDataContext The global data context of the component calling this function.
 * @param {{}} templateContext The template context of the component calling this function.
 *
 * @returns {{formDataPath: undefined, formData: undefined}}
 */
export const propsDataLocationToPathAndValue = ({
    currentPath,
    datafield,
    dataLocation,
    defaultValue,
    globalDataContext,
    templateContext,
}) => {
    const result = {
        // This is the data that contains the current checked state.
        formData: undefined, // This is the path that leads to the data.
        formDataPath: undefined,
    };

    if (dataLocation && typeof dataLocation === "string") {
        // A custom data location has been specified.
        result.formData =
            evaluateTemplateValue({
                globalDataContext: globalDataContext,
                templateContext: templateContext,
                valueToEvaluate: dataLocation,
            }) ?? defaultValue;
        result.formDataPath = dataLocationToPath({
            dataLocation: dataLocation,
            currentPath: currentPath,
            globalDataContext,
            templateContext,
        });
    } else {
        // Use the template data.
        if ((templateContext.templateData[datafield] ?? undefined) === undefined) {
            // Initialize the data for this component.
            if (typeof templateContext.templateData === "object" && templateContext.templateData !== null) {
                templateContext.templateData[datafield] = defaultValue;
            } else {
                try {
                    templateContext.templateData = {};
                    templateContext.templateData[datafield] = defaultValue;
                } catch (e) {
                    // Ignore read-only errors.
                }
            }
        }

        // The data is located in the template context data,
        // under the datafield key. (Dev note: this is maybe not the best way to handle this.)
        result.formData = templateContext.templateData[datafield];

        result.formDataPath = dataLocationToPath({
            dataLocation: "~." + datafield,
            currentPath: templateContext.templatePath,
            globalDataContext,
            templateContext,
        });
    }

    return result;
};

/**
 * Evaluates every template value of a mapping structure, recursively.
 *
 * Only the mapping structure is walked: the evaluated values are kept as is.
 *
 * @param {*} mapping The mapping structure (object, array or single value).
 * @param {{}} globalDataContext The global data context.
 * @param {{}} templateContext The template context the template values are evaluated against.
 *
 * @returns {*} The evaluated mapping.
 */
const evaluateMapping = (mapping, globalDataContext, templateContext) => {
    if (Array.isArray(mapping)) {
        return mapping.map((item) => evaluateMapping(item, globalDataContext, templateContext));
    }

    if (typeof mapping === "object" && mapping !== null) {
        return Object.fromEntries(
            Object.entries(mapping).map(([key, value]) => [
                key,
                evaluateMapping(value, globalDataContext, templateContext),
            ])
        );
    }

    return evaluateTemplateValue({ valueToEvaluate: mapping, globalDataContext, templateContext });
};

/**
 * Gets the evaluated options of an option-based element (CheckBoxField, SelectField, LabelFromValue...).
 *
 * The options are read from `props.dynamicOptions` (a template reference, takes precedence)
 * or from the static `props.options` array. Each option is returned as an object
 * whose `label` and `value` are evaluated:
 * - With `props.optionMapping`, the mapping is evaluated for each item, the item being
 *   the template context (`~`). The mapped keys override the item keys, so any list shape
 *   can feed the element (e.g. `optionMapping: {label: ~.title, value: ~.id}`).
 * - Without `props.optionMapping`, the `label` and `value` of each item are evaluated
 *   in the element's template context. A scalar item is used as both label and value.
 *
 * @param {{}} props The element props.
 * @param {{}} globalDataContext The global data context of the element.
 * @param {{}} templateContext The template context of the element.
 *
 * @returns {Array<{}>} The evaluated options. Empty when the source is not an array.
 */
export const evaluateFieldOptions = ({ props, globalDataContext, templateContext }) => {
    let source;
    let sourcePath;

    if (props.dynamicOptions) {
        source = evaluateTemplateValue({
            valueToEvaluate: props.dynamicOptions,
            globalDataContext,
            templateContext,
        });

        if (isTemplateValue(props.dynamicOptions)) {
            try {
                sourcePath = dataLocationToPath({
                    dataLocation: props.dynamicOptions,
                    currentPath: templateContext.templatePath,
                    globalDataContext,
                    templateContext,
                });
            } catch {
                // The items are then evaluated without a template path.
            }
        }
    } else {
        source = props.options;
    }

    if (!Array.isArray(source)) {
        return [];
    }

    const optionMapping = props.optionMapping;

    if (typeof optionMapping === "object" && optionMapping !== null) {
        return source.map((item, index) => {
            const itemTemplateContext = {
                templatePath: sourcePath === undefined ? templateContext.templatePath : sourcePath + "." + index,
                templateData: item,
            };
            const itemAsObject = typeof item === "object" && item !== null ? item : {};

            return { ...itemAsObject, ...evaluateMapping(optionMapping, globalDataContext, itemTemplateContext) };
        });
    }

    return source.map((item) => {
        if (typeof item !== "object" || item === null) {
            const evaluatedItem = evaluateTemplateValue({ valueToEvaluate: item, globalDataContext, templateContext });

            return { label: evaluatedItem, value: evaluatedItem };
        }

        return {
            ...item,
            label: evaluateTemplateValue({ valueToEvaluate: item.label, globalDataContext, templateContext }),
            value: evaluateTemplateValue({ valueToEvaluate: item.value, globalDataContext, templateContext }),
        };
    });
};
