import { parseRjBuild } from "../../../../lib/engine/utility/parseRjBuild";
import {
    expectedYamlObject,
    invalidJsonObject,
    invalidYamlObject,
    validJsonObject,
    validYamlObject,
} from "./parseRjBuild.mockData";

describe("parseRjBuild", () => {
    describe("JSON", () => {
        it("should parse a JSON object", () => {
            const jsonToTest = JSON.stringify(validJsonObject);
            const result = parseRjBuild(jsonToTest);
            expect(result.success).toBe(true);
            expect(result.format).toBe("json");
            expect(result.data).toEqual(validJsonObject);
        });

        it("should return an error if the JSON is invalid", () => {
            const result = parseRjBuild(invalidJsonObject);
            expect(result.success).toBe(false);
            expect(result.format).toBe("json");
            expect(result.error).toBeDefined();
        });
    });

    describe("YAML", () => {
        it("should parse a YAML object", () => {
            const result = parseRjBuild(validYamlObject);
            expect(result.success).toBe(true);
            expect(result.format).toBe("yaml");
            expect(result.data).toEqual(expectedYamlObject);
        });

        it("should return an error if the YAML is invalid", () => {
            const result = parseRjBuild(invalidYamlObject);
            expect(result.success).toBe(false);
            expect(result.format).toBe("yaml");
            expect(result.error).toBeDefined();
        });
    });
});
