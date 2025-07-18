import {
    ActionDependant,
    evaluateTemplateValueCollection,
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

    const rjOptions = evaluateTemplateValueCollection({
        valueToEvaluate: props?.rjOptions,
        globalDataContext,
        templateContext,
    }) || {};

    if (typeof rjOptions !== "object") {
        // Not a valid definition.
        return;
    }

    const parsedInt = parseInt(props?.dataOverrideEvaluationDepth);

    if (rjOptions?.dataOverride && Number.isInteger(parsedInt) && parsedInt !== 0) {
        // The dataOverride property has a special evaluation depth.
        // Note: by default, we do not evaluate the dataOverride property,
        // as it was already evaluated once earlier.
        rjOptions.dataOverride = evaluateTemplateValueCollection({
            valueToEvaluate: rjOptions?.dataOverride,
            globalDataContext,
            templateContext,
            evaluationDepth: parseInt(props?.dataOverrideEvaluationDepth),
        }) || {};
    }

    // We use the same plugins as the parent ReactiveJsonRoot.
    const plugins = globalDataContext.plugins ?? {};

    return <ActionDependant {...props}>
        <ReactiveJsonRoot {...rjOptions} plugins={plugins}/>
    </ActionDependant>;
};
