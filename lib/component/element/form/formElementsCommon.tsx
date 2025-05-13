import {dataLocationToPath, evaluateTemplateValue} from "../../../engine/TemplateSystem";

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
                                                    templateContext
                                                }) => {

    const result = {
        // This is the data that contains the current checked state.
        formData: undefined, // This is the path that leads to the data.
        formDataPath: undefined,
    };

    if (dataLocation && typeof dataLocation === "string") {
        // A custom data location has been specified.
        result.formData = evaluateTemplateValue({
            globalDataContext: globalDataContext, templateContext: templateContext, valueToEvaluate: dataLocation,
        }) ?? defaultValue;
        result.formDataPath = dataLocationToPath({dataLocation: dataLocation, currentPath: currentPath, globalDataContext, templateContext});
    } else {
        // Use the template data.
        if ((templateContext.templateData[datafield] ?? undefined) === undefined) {
            // Initialize the data for this component.
            templateContext.templateData = (typeof templateContext.templateData === "object") ? templateContext.templateData : {};
            templateContext.templateData[datafield] = defaultValue;
        }

        // The data is located in the template context data,
        // under the datafield key. (Dev note: this is maybe not the best way to handle this.)
        result.formData = templateContext.templateData[datafield];

        result.formDataPath = dataLocationToPath({
            dataLocation: "~." + datafield, currentPath: templateContext.templatePath, globalDataContext, templateContext
        });
    }

    return result;
};
