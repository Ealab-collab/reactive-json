import {
    ActionDependant,
    evaluateTemplateValueCollection,
    GlobalDataContext,
    ReactiveJsonRoot,
    TemplateContext
} from "../../../engine/index.js";
import {useContext} from "react";
import {analyzeDataOverrideReferences} from "../../../engine/utility";
import {dataLocationToPath} from "../../../engine/TemplateSystem.jsx";

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

    // Handle upstream update propagation.
    let upstreamUpdateCallbacks = undefined;

    if (props?.sharedUpdates === true && props?.rjOptions?.dataOverride) {
        // Analyze the original dataOverride to detect references to parent data.
        const dataOverrideReferences = analyzeDataOverrideReferences(props.rjOptions.dataOverride);
        
        if (dataOverrideReferences.size > 0) {
            upstreamUpdateCallbacks = new Map();
            
            for (const [pathInDataOverride, templateReference] of dataOverrideReferences) {
                // Create an update callback for each parent reference.
                const upstreamCallback = (newValue, relativePath, updateMode) => {
                    try {
                        // Use dataLocationToPath to resolve the template reference to a complete path.
                        const evaluatedPath = dataLocationToPath({
                            dataLocation: templateReference,
                            currentPath: templateContext.templatePath,
                            globalDataContext,
                            templateContext
                        });
                        
                        // Build the final path by appending the relative path if provided.
                        // The relative path is given by the nested rjBuild, and starts from
                        // the templateReference location in the dataOverride.
                        const finalPathToUpdate = relativePath ? `${evaluatedPath}.${relativePath}` : evaluatedPath;
                        
                        // Use updateData from the global context.
                        globalDataContext.updateData(newValue, finalPathToUpdate, updateMode);
                    } catch (error) {
                        console.warn(`Error during upstream propagation for ${templateReference}:`, error);
                    }
                };
                
                upstreamUpdateCallbacks.set(pathInDataOverride, upstreamCallback);
            }
        }
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
        <ReactiveJsonRoot 
            {...rjOptions} 
            plugins={plugins}
            upstreamUpdateCallbacks={upstreamUpdateCallbacks}
        />
    </ActionDependant>;
};
