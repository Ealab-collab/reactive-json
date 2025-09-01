import { normalizeAttributeNameForReactJsx } from "../../engine/utility/reactJsxHelpers.jsx";

/**
 * Removes an attribute entirely.
 *
 * @param {{ attributes: Object, singleTransformProps: Object }} props
 * @returns {Object} New attributes object.
 */
export const unsetAttribute = ({ attributes, singleTransformProps }) => {
    if (typeof singleTransformProps?.name !== "string" || singleTransformProps.name === "") {
        return attributes;
    }

    const normalizedName = normalizeAttributeNameForReactJsx(singleTransformProps?.name);

    if (!attributes?.[normalizedName]) {
        return attributes;
    }

    // Remove the attribute.
    delete attributes[normalizedName];
    return attributes;
};
