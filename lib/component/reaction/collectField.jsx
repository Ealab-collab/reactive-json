import { dataLocationToPath, evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

/**
 * Writes the values of a field of every item of a collection, as an array, at the specified path.
 *
 * Typical use: a "select all" checkbox writing the identifiers of the listed items.
 * The items that are not objects, and the items whose field is null, undefined or an empty string,
 * are skipped. A collection that is not an array writes an empty array.
 *
 * @param {{}} props
 */
export const collectField = (props) => {
    const { globalDataContext: _globalDataContext, templateContext } = props;
    const { field, from, path } = props.args;

    if (path === undefined) {
        console.warn('collectField: the "path" argument is required.');
        return;
    }

    // Read the complete data, not the data that a DataFilter may have filtered.
    const globalDataContext = _globalDataContext.getRootContext
        ? _globalDataContext.getRootContext()
        : _globalDataContext;

    const evaluatedField = evaluateTemplateValue({ valueToEvaluate: field, globalDataContext, templateContext });

    if (evaluatedField === undefined || evaluatedField === null || evaluatedField === "") {
        return;
    }

    const collection = evaluateTemplateValue({ valueToEvaluate: from, globalDataContext, templateContext });

    const values = (Array.isArray(collection) ? collection : [])
        .map((item) => (item !== null && typeof item === "object" ? item[evaluatedField] : undefined))
        .filter((fieldValue) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "");

    const dataAbsolutePath = dataLocationToPath({
        currentPath: templateContext.templatePath,
        dataLocation: path,
        globalDataContext,
        templateContext,
    });

    globalDataContext.updateData(values, dataAbsolutePath);
};
