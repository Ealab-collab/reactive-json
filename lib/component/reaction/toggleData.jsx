import { dataLocationToPath, evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

/**
 * Toggles a value in the array at the specified path.
 *
 * The value is appended when it is absent from the array, and removed when it is present.
 * The other values of the array are kept. A missing location, or a value that is not an array,
 * counts as an empty array.
 *
 * The values are compared as strings, so that a numeric identifier matches its text form
 * (e.g. 12 and "12"). Nothing happens when the value is null, undefined or an empty string,
 * such as a value from a data source that is not loaded yet.
 *
 * @param {{}} props
 */
export const toggleData = (props) => {
    const { globalDataContext: _globalDataContext, templateContext } = props;
    const { path, value } = props.args;

    if (path === undefined) {
        console.warn('toggleData: the "path" argument is required.');
        return;
    }

    // Read the complete data, not the data that a DataFilter may have filtered.
    const globalDataContext = _globalDataContext.getRootContext
        ? _globalDataContext.getRootContext()
        : _globalDataContext;

    const evaluatedValue = evaluateTemplateValue({ valueToEvaluate: value, globalDataContext, templateContext });

    if (evaluatedValue === undefined || evaluatedValue === null || evaluatedValue === "") {
        return;
    }

    const currentValue = evaluateTemplateValue({ valueToEvaluate: path, globalDataContext, templateContext });
    const currentArray = Array.isArray(currentValue) ? currentValue : [];
    const valueAsString = String(evaluatedValue);
    const isPresent = currentArray.some((item) => String(item) === valueAsString);

    const dataAbsolutePath = dataLocationToPath({
        currentPath: templateContext.templatePath,
        dataLocation: path,
        globalDataContext,
        templateContext,
    });

    globalDataContext.updateData(
        isPresent
            ? currentArray.filter((item) => String(item) !== valueAsString)
            : [...currentArray, evaluatedValue],
        dataAbsolutePath
    );
};
