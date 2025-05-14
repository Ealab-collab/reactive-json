/**
 * Snippet from https://stackoverflow.com/a/1414175.
 *
 * Enhanced to support other value types.
 */
export function stringToBoolean(stringValue) {
    if (!stringValue) {
        return false;
    }

    if (typeof stringValue === "boolean") {
        return stringValue;
    }

    if (typeof stringValue !== "string") {
        return true;
    }

    switch (stringValue?.toLowerCase()?.trim()) {
        case "true":
        case "yes":
        case "1":
            return true;

        case "false":
        case "no":
        case "0":
        case "null":
        case "undefined":
            return false;

        default:
            return stringValue.length > 0;
    }
}
