import {dataLocationToPath, evaluateTemplateValueCollection} from "../../engine/TemplateSystem.jsx";
import {cloneDeep} from "lodash";

/**
 * Sets data at the specified path.
 *
 * @param {{}} props
 */
export const setData = (props) => {
    const {globalDataContext, templateContext} = props;
    const {path, value} = props.args;

    if (path === undefined) {
        return;
    }

    const dataAbsolutePath = dataLocationToPath({currentPath: templateContext.templatePath, dataLocation: path, globalDataContext, templateContext});

    const evaluatedValue = evaluateTemplateValueCollection({valueToEvaluate: value, globalDataContext, templateContext});

    // We clone the value to have distinct instances when the value is an object.
    globalDataContext?.updateData(typeof evaluatedValue !== "object" ? evaluatedValue : cloneDeep(evaluatedValue), dataAbsolutePath);
};
