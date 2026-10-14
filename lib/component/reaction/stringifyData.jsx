import { dataLocationToPath, evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

/**
 * Writes the JSON representation of a value at the specified path.
 *
 * The write is synchronous: placed before a submitData in the same actions list,
 * it guarantees that the submitted data holds the fresh JSON string.
 * An undefined value writes an empty string.
 *
 * @param {{}} props
 */
export const stringifyData = (props) => {
    const { globalDataContext: _globalDataContext, templateContext } = props;
    const { from, path } = props.args;

    if (path === undefined) {
        console.warn('stringifyData: the "path" argument is required.');
        return;
    }

    // Read the complete data, not the data that a DataFilter may have filtered.
    const globalDataContext = _globalDataContext.getRootContext
        ? _globalDataContext.getRootContext()
        : _globalDataContext;

    const value = evaluateTemplateValue({ valueToEvaluate: from, globalDataContext, templateContext });

    const dataAbsolutePath = dataLocationToPath({
        currentPath: templateContext.templatePath,
        dataLocation: path,
        globalDataContext,
        templateContext,
    });

    globalDataContext.updateData(value === undefined ? "" : JSON.stringify(value), dataAbsolutePath);
};
