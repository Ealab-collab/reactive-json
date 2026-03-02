/**
 * Resolves a value that is either a plain string or an array of segments
 * into a single concatenated string.
 *
 * When the input is a string, it is returned as-is (passthrough).
 * When the input is an array, each segment is processed:
 *   - Segments starting with "~~." are treated as store references:
 *     the part after "~~." is passed to the getter function to retrieve the value.
 *   - All other segments are used as literal strings.
 *
 * This is useful for building dynamic URLs or other strings that mix
 * literal parts with data-driven values resolved at runtime.
 *
 * @param {string|Array} segments - A string (returned as-is) or an array of segments to resolve and concatenate.
 * @param {function} getter - A function that takes a dotted path string and returns the corresponding value.
 * @returns {string|null} The concatenated result, or null if the input is invalid.
 */
export const interpolateSegments = (segments, getter) => {
    if (typeof segments === "string") {
        return segments || null;
    }

    if (!Array.isArray(segments) || segments.length === 0) {
        return null;
    }

    return segments.map((segment) => {
        if (typeof segment === "string" && segment.startsWith("~~.")) {
            const path = segment.substring(3);
            const resolved = getter(path);

            if (resolved === undefined || resolved === null) {
                console.warn(
                    `interpolateSegments: reference "${segment}" resolved to ${resolved}.`
                );
                return "";
            }

            return String(resolved);
        }

        return String(segment ?? "");
    }).join("");
};
