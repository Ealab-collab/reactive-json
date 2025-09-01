import { useContext } from "react";
import { isValid } from "../../engine/Actions.jsx";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";

/**
 * Applies attribute transforms.
 *
 * @param {{}} attrsToTransform Raw attributes.
 * @param {Array} transformProps Attribute transform definitions.
 * @returns {{}} Final attributes to spread on the element/component.
 */
export const useTransformedAttributes = (attrsToTransform, transformProps) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    if (!transformProps) {
        // No transforms defined.
        return attrsToTransform;
    }

    // Retrieve the transformers from the global data context.
    const transformers = globalDataContext.plugins?.attributeTransformer ?? [];

    if (!transformers) {
        // No enabled transformers.
        return attrsToTransform;
    }

    // Apply transforms to the attributes.
    return transformProps.reduce((acc, singleTransformProps) => {
        const transformer = transformers[singleTransformProps.what]

        if (!transformer) {
            // The transformer is not enabled. Ignore it.
            return acc;
        }

        if (!isValid(singleTransformProps, {globalDataContext, templateContext})) {
            // The transformer is not valid/allowed. Ignore it.
            return acc;
        }

        return transformer({attributes: acc, globalDataContext, singleTransformProps, templateContext});
    }, attrsToTransform);
};
