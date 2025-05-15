import {
    evaluateTemplateValue,
    GlobalDataContext,
    ReactiveJsonRoot,
    TemplateContext
} from "../../../engine/index.js";
import {useContext} from "react";

/**
 * Allows a subroot of reactive-json.
 *
 * @returns {JSX.Element|void}
 */
export const ReactiveJsonSubroot = ({props}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const rjOptions = evaluateTemplateValue({
        valueToEvaluate: props?.rjOptions,
        globalDataContext,
        templateContext,
    }) || {};

    if (typeof rjOptions !== "object") {
        // Not a valid definition.
        return;
    }

    // We use the same plugins as the parent ReactiveJsonRoot.
    const plugins = globalDataContext.plugins ?? {};

    return <ReactiveJsonRoot {...rjOptions} plugins={plugins}/>;
};
