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

        return jsonResult.success || jsonResult.position !== null
            ? jsonResult
            : parseAsYaml(rjBuild);
    }

    // The value may already be parsed. Return it as-is.
    return rjBuild;
};
