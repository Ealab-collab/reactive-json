import {load} from "js-yaml";

export const parseRjBuild = (rjBuild) => {
    if (typeof rjBuild !== "object") {
        try {
            // Parse as JSON.
            return JSON.parse(rjBuild);
        } catch {
            try {
                // Parse as YAML.
                return load(rjBuild);
            } catch {
                // Could not parse.
            }
        }
    }

    // The value may already be parsed. Return it as-is.
    return rjBuild;
}
