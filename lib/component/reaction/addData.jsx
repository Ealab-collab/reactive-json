import {
    dataLocationToPath,
    evaluateTemplateValueCollection,
} from "../../engine/TemplateSystem.jsx";
import { cloneDeep } from "lodash";

/**
 * Adds data at the specified path.
 *
 * @param {{}} props
 */
export const addData = (props) => {
    const { globalDataContext, templateContext } = props;
    const { path, value } = props.args;

    if (path === undefined) {
        return;
    }

    const dataAbsolutePath = dataLocationToPath({
        currentPath: templateContext.templatePath,
        dataLocation: path,
        globalDataContext,
        templateContext,
    });

    const evaluatedValue = evaluateTemplateValueCollection({
        valueToEvaluate: value,
        globalDataContext,
        templateContext,
    });

    // In Experimental Mode, we need to pass the "add" mode to the store.
    // ReactiveJsonRootExperimental.updateData handles the path prefix removal.
    
    // We clone the value to have distinct instances when the value is an object.
    globalDataContext?.updateData(
        typeof evaluatedValue !== "object" ? evaluatedValue : cloneDeep(evaluatedValue),
        dataAbsolutePath,
        "add"
    );
};
