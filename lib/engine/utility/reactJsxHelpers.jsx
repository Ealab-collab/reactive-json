/**
 * Helper functions for React JSX normalization.
 * This module is independent and doesn't import from other engine modules
 * to avoid circular dependencies.
 */

/**
 * Normalizes HTML attributes for React JSX compatibility.
 * Converts HTML attribute names to their React equivalents.
 *
 * @param {object} maybeAttributesObj - The attributes object to normalize
 * @returns {object} - The normalized attributes object
 */
export const normalizeAttributesForReactJsx = (maybeAttributesObj) => {
    if (typeof maybeAttributesObj !== "object" || Object.keys(maybeAttributesObj).length === 0) {
        // Not a valid attributes object.
        return {};
    }

    const mapping = {
        class: "className",
    };

    // Recreate a shallow copy with the normalized attribute keys.
    const attributesObj = {};

    for (const [attributeName, attributeValue] of Object.entries(maybeAttributesObj)) {
        const finalAttributeName = mapping.hasOwnProperty(attributeName) ? mapping[attributeName] : attributeName;
        attributesObj[finalAttributeName] = attributeValue;
    }

    return attributesObj;
};
