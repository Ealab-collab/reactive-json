/**
 * Helper functions for React JSX normalization.
 * This module is independent and doesn't import from other engine modules
 * to avoid circular dependencies.
 */

const mapping = {
    class: "className",
    for: "htmlFor",
};

/**
 * Normalizes HTML attributes for React JSX compatibility.
 * Converts HTML attribute names to their React equivalents.
 *
 * @param {object} maybeAttributesObj - The attributes object to normalize, e.g. { class: "active", for: "input" }.
 * @returns {object} - The normalized attributes object, e.g. { className: "active", htmlFor: "input" }.
 */
export const normalizeAttributesForReactJsx = (maybeAttributesObj) => {
    if (typeof maybeAttributesObj !== "object" || Object.keys(maybeAttributesObj).length === 0) {
        // Not a valid attributes object.
        return {};
    }

    // Recreate a shallow copy with the normalized attribute keys.
    const attributesObj = {};

    for (const [attributeName, attributeValue] of Object.entries(maybeAttributesObj)) {
        const finalAttributeName = normalizeAttributeNameForReactJsx(attributeName);
        attributesObj[finalAttributeName] = attributeValue;
    }

    return attributesObj;
};

/**
 * Normalizes an attribute name for React JSX compatibility.
 *
 * @param {string} attributeName - The attribute name to normalize, e.g. "class", "for", etc.
 * @returns {string} - The normalized attribute name, e.g. "className", "htmlFor", etc.
 */
export const normalizeAttributeNameForReactJsx = (attributeName) => {
    return mapping.hasOwnProperty(attributeName) ? mapping[attributeName] : attributeName;
};
