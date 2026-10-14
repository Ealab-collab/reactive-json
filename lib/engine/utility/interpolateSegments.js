/**
 * Resolves a reference string (~~.path or ~.path) or a plain value, without converting it.
 *
 * Without resolveTemplateValue, the reference is looked up with the store getter:
 * both ~~. and ~. are treated identically (root store data).
 * With resolveTemplateValue, every string is passed to it, so that the references
 * are evaluated in the caller's template contexts.
 *
 * @param {*} ref - The value to resolve. If a string starting with ~~. or ~., it is looked up in the store.
 * @param {function} getter - Store getter function.
 * @param {function} [resolveTemplateValue] - Evaluates a string that may be a template reference.
 * @returns {*} The resolved value.
 */
const resolveRawRef = (ref, getter, resolveTemplateValue) => {
    if (typeof ref !== "string") {
        return ref;
    }

    if (resolveTemplateValue) {
        return resolveTemplateValue(ref);
    }

    if (ref.startsWith("~~.")) {
        return getter(ref.substring(3));
    }

    if (ref.startsWith("~.")) {
        return getter(ref.substring(2));
    }

    return ref;
};

/**
 * Converts a resolved value to a string.
 *
 * @param {*} value - The resolved value.
 * @returns {string|null} The string, or null when the value is null or undefined.
 */
const toText = (value) => (value === undefined || value === null ? null : String(value));

/**
 * Resolves a reference string (~~.path or ~.path) or a plain value to a string.
 *
 * @param {*} ref - The value to resolve.
 * @param {function} getter - Store getter function.
 * @param {function} [resolveTemplateValue] - Evaluates a string that may be a template reference.
 * @returns {string|null} The resolved string value, or null if the ref is empty/missing.
 */
const resolveRef = (ref, getter, resolveTemplateValue) => toText(resolveRawRef(ref, getter, resolveTemplateValue));

/**
 * Resolves the value of a query param to the list of its string values.
 *
 * An array gives one value per item, so that the param is repeated (`key=a&key=b`);
 * its items that are null, undefined, empty strings or objects are skipped.
 * Any other value gives a single value.
 *
 * @param {*} ref - The value to resolve.
 * @param {function} getter - Store getter function.
 * @param {function} [resolveTemplateValue] - Evaluates a string that may be a template reference.
 * @returns {string[]} The non-empty string values. Empty when the value is empty.
 */
const resolveParamValues = (ref, getter, resolveTemplateValue) => {
    const resolved = resolveRawRef(ref, getter, resolveTemplateValue);
    const items = Array.isArray(resolved) ? resolved.filter((item) => typeof item !== "object") : [resolved];

    return items.map(toText).filter(Boolean);
};

/**
 * Describes a segment source for a warning.
 *
 * @param {*} source - The segment source, as written in the segments (or as given by an event placeholder).
 * @returns {string} A short readable description.
 */
const describeSource = (source) => (typeof source === "string" ? `"${source}"` : String(source));

/**
 * Resolves a value that is either a plain string or an array of segments
 * into a single URL string, including any query parameters.
 *
 * When the input is a string, it is returned as-is (passthrough).
 * When the input is an array, each element is one of:
 *
 *   - A plain string: used as a literal path segment.
 *   - A string starting with "~~." or "~.": resolved from the store (root data).
 *   - An object with "segment" key: resolved as a path segment.
 *       { segment: "~~.myVal", required: true }
 *       If "required" is true and the resolved value is empty/null → the whole URL is aborted (returns null).
 *   - An object with "param" key: resolved as a URL query parameter.
 *       { param: "id", value: "~~.myId" }
 *       { param: "~~.paramName", value: "~~.paramVal", required: true }
 *       When the value is an array, the param is repeated for each item (`id=1&id=2`).
 *       If either key or value is empty/null (or an empty array):
 *         - Without "required": the param is silently omitted.
 *         - With "required: true": the whole URL is aborted (returns null).
 *
 * @param {string|Array} segments - A string (returned as-is) or an array of segment descriptors.
 * @param {function} getter - A function that takes a dotted path string and returns the corresponding store value.
 * @param {function|{resolveTemplateValue: function, label: string}} [options] - Options:
 *     - resolveTemplateValue: evaluates a string that may be a template reference. When given, it replaces
 *       the getter, so that the references are evaluated in the caller's template contexts
 *       (see interpolateSegmentsInContext). A function given directly as options is used as resolveTemplateValue.
 *     - label: names the caller in the warnings (e.g. "redirectNow"). Defaults to "interpolateSegments".
 * @returns {string|null} The full URL string (with query params if any), or null if aborted/invalid.
 */
export const interpolateSegments = (segments, getter, options) => {
    const { resolveTemplateValue, label = "interpolateSegments" } =
        typeof options === "function" ? { resolveTemplateValue: options } : options ?? {};

    if (typeof segments === "string") {
        return segments || null;
    }

    if (!Array.isArray(segments) || segments.length === 0) {
        return null;
    }

    const pathParts = [];
    const queryParams = [];

    for (const [index, segment] of segments.entries()) {
        // Object-based segment descriptor
        if (segment !== null && typeof segment === "object") {
            // Query param: { param, value, required? }
            if ("param" in segment) {
                const resolvedKey = resolveRef(segment.param, getter, resolveTemplateValue);
                const resolvedValues = resolveParamValues(segment.value, getter, resolveTemplateValue);
                const isEmpty = !resolvedKey || resolvedValues.length === 0;

                if (isEmpty) {
                    if (segment.required) {
                        console.warn(
                            `${label}: required param ${describeSource(segment.param)} (part ${index}, value ${describeSource(segment.value)}) is empty — aborting URL.`
                        );
                        return null;
                    }
                    // Silently omit the param
                    continue;
                }

                for (const resolvedValue of resolvedValues) {
                    queryParams.push(`${encodeURIComponent(resolvedKey)}=${encodeURIComponent(resolvedValue)}`);
                }
                continue;
            }

            // Path segment: { segment, required? }
            if ("segment" in segment) {
                const resolvedPart = resolveRef(segment.segment, getter, resolveTemplateValue);

                if (!resolvedPart) {
                    if (segment.required) {
                        console.warn(
                            `${label}: required segment ${describeSource(segment.segment)} (part ${index}) is empty — aborting URL.`
                        );
                        return null;
                    }
                    pathParts.push("");
                    continue;
                }

                pathParts.push(resolvedPart);
                continue;
            }

            // Unknown object shape — skip with a warning
            console.warn(`${label}: unrecognized segment object (part ${index}).`, segment);
            continue;
        }

        // String segment: plain literal or ~~./~. reference
        if (typeof segment === "string") {
            const resolved = resolveRef(segment, getter, resolveTemplateValue);

            if (resolved === null) {
                console.warn(`${label}: reference ${describeSource(segment)} (part ${index}) resolved to null.`);
                pathParts.push("");
            } else {
                pathParts.push(resolved);
            }
            continue;
        }

        // Fallback for numbers, booleans, etc.
        pathParts.push(String(segment ?? ""));
    }

    const path = pathParts.join("");
    // Continue the query string of the path when it already has one.
    const querySeparator = path.includes("?") ? "&" : "?";
    const queryString = queryParams.length > 0 ? querySeparator + queryParams.join("&") : "";

    return path + queryString || null;
};
