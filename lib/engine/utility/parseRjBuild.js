import { load } from "js-yaml";

const parseAsJson = (rjBuild) => {
    try {
        const result = JSON.parse(rjBuild);
        return { success: true, format: "json", data: result };
    } catch (error) {
        const match = /at position (\d+)/.exec(error.message);
        const pos = match ? Number(match[1]) : null;

        return {
            error,
            success: false,
            format: "json",
            position: pos,
        };
    }
};

const parseAsYaml = (rjBuild) => {
    try {
        const data = load(rjBuild);
        return { success: true, format: "yaml", data };
    } catch (error) {
        const mark = error?.source?.range?.start ?? error?.linePos ?? null;

        return {
            error,
            success: false,
            format: "yaml",
            position: mark,
        };
    }
};

export const parseRjBuild = (rjBuild) => {
    if (typeof rjBuild !== "object") {
        const jsonResult = parseAsJson(rjBuild);

        if (jsonResult.success || jsonResult.position !== null) {
            return jsonResult;
        }

        const yamlResult = parseAsYaml(rjBuild);

        if (yamlResult.success || yamlResult.position !== null) {
            return yamlResult;
        }

        // Both parsing attempts failed. Determine which format is more likely to be the correct one.
        if (rjBuild.startsWith("{") || rjBuild.startsWith("[")) {
            // We assume that it is JSON formatted.
            return jsonResult;
        }

        // This is probably YAML formatted.
        return yamlResult;
    }

    // The value may already be parsed (deserialized).
    // Return the value as if it is a valid RjBuild.
    return {
        success: true,
        format: "JS native object",
        data: rjBuild,
    };
};
