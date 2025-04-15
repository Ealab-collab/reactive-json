import {dataLocationToPath, evaluateTemplateValue} from "../../engine/TemplateSystem";
import {cloneDeep} from "lodash";

/**
 * Adds data at the specified path.
 *
 * @param {{}} props
 */
export const addData = (props) => {
    const {globalDataContext, templateContext} = props;
    const {path, value} = props.args;

    if (path === undefined) {
        return;
    }

    const dataAbsolutePath = dataLocationToPath({currentPath: templateContext.templatePath, dataLocation: path, globalDataContext, templateContext});

    const evaluatedValue = evaluateTemplateValue({valueToEvaluate: value, globalDataContext, templateContext});

    // We clone the value to have distinct instances when the value is an object.
    globalDataContext?.updateData(typeof evaluatedValue !== "object" ? evaluatedValue : cloneDeep(evaluatedValue), dataAbsolutePath, "add");
};
