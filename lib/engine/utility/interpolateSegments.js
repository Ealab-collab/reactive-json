/**
 * Resolves a reference string (~~.path or ~.path) or a plain value using the store getter.
 * Both ~~. and ~. are treated identically (root store data) in this context.
 *
 * @param {*} ref - The value to resolve. If a string starting with ~~. or ~., it is looked up in the store.
 * @param {function} getter - Store getter function.
 * @returns {string|null} The resolved string value, or null if the ref is empty/missing.
 */
const resolveRef = (ref, getter) => {
    if (typeof ref === "string") {
        let path = null;

        if (ref.startsWith("~~.")) {
            path = ref.substring(3);
        } else if (ref.startsWith("~.")) {
            path = ref.substring(2);
        }

        if (path !== null) {
            const resolved = getter(path);

            return (resolved === undefined || resolved === null) ? null : String(resolved);
        }

        return ref;
    }

    return ref === undefined || ref === null ? null : String(ref);
};

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
 *       If either key or value is empty/null:
 *         - Without "required": the param is silently omitted.
 *         - With "required: true": the whole URL is aborted (returns null).
 *
 * @param {string|Array} segments - A string (returned as-is) or an array of segment descriptors.
 * @param {function} getter - A function that takes a dotted path string and returns the corresponding store value.
 * @returns {string|null} The full URL string (with query params if any), or null if aborted/invalid.
 */
export const interpolateSegments = (segments, getter) => {
    if (typeof segments === "string") {
        return segments || null;
    }

    if (!Array.isArray(segments) || segments.length === 0) {
        return null;
    }

    const pathParts = [];
    const queryParams = [];

    for (const segment of segments) {
        // Object-based segment descriptor
        if (segment !== null && typeof segment === "object") {
            // Query param: { param, value, required? }
            if ("param" in segment) {
                const resolvedKey = resolveRef(segment.param, getter);
                const resolvedValue = resolveRef(segment.value, getter);
                const isEmpty = !resolvedKey || !resolvedValue;

                if (isEmpty) {
                    if (segment.required) {
                        console.warn(
                            `interpolateSegments: required param "${segment.param}" resolved to empty key or value — aborting URL.`
                        );
                        return null;
                    }
                    // Silently omit the param
                    continue;
                }

                queryParams.push(
                    `${encodeURIComponent(resolvedKey)}=${encodeURIComponent(resolvedValue)}`
                );
                continue;
            }

            // Path segment: { segment, required? }
            if ("segment" in segment) {
                const resolvedPart = resolveRef(segment.segment, getter);

                if (!resolvedPart) {
                    if (segment.required) {
                        console.warn(
                            `interpolateSegments: required segment "${segment.segment}" resolved to empty — aborting URL.`
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
            console.warn("interpolateSegments: unrecognized segment object.", segment);
            continue;
        }

        // String segment: plain literal or ~~./~. reference
        if (typeof segment === "string") {
            const resolved = resolveRef(segment, getter);

            if (resolved === null) {
                console.warn(
                    `interpolateSegments: reference "${segment}" resolved to null.`
                );
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
    const queryString = queryParams.length > 0 ? "?" + queryParams.join("&") : "";

    return path + queryString || null;
};
