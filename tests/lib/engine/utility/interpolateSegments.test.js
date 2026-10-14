import { interpolateSegments } from "../../../../lib/engine/utility/interpolateSegments.js";
import { interpolateSegmentsInContext } from "../../../../lib/engine/TemplateSystem.jsx";

describe("interpolateSegments", () => {
    const store = { id: 7, slug: "hello", empty: "" };
    const getter = (path) => store[path];

    beforeEach(() => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("returns a string as is", () => {
        expect(interpolateSegments("/api/items", getter)).toBe("/api/items");
    });

    it("joins literal segments and store references", () => {
        expect(interpolateSegments(["/items/", "~~.id", "/", "~.slug"], getter)).toBe("/items/7/hello");
    });

    it("adds an empty string for an empty reference that is not required", () => {
        expect(interpolateSegments(["/items/", "~~.missing"], getter)).toBe("/items/");
    });

    it("aborts when a required segment or param is empty", () => {
        expect(interpolateSegments(["/items/", { segment: "~~.missing", required: true }], getter)).toBeNull();
        expect(interpolateSegments(["/items", { param: "q", value: "~~.empty", required: true }], getter)).toBeNull();
    });

    it("omits an empty param that is not required", () => {
        expect(interpolateSegments(["/items", { param: "q", value: "~~.empty" }], getter)).toBe("/items");
    });

    it("repeats a param for each item of an array value, skipping the empty items", () => {
        const getArray = (path) => ({ ids: [3, "", null, 5, { x: 1 }], none: [] })[path];

        expect(interpolateSegments(["/items", { param: "id", value: "~~.ids" }], getArray)).toBe("/items?id=3&id=5");
        expect(interpolateSegments(["/items", { param: "id[]", value: "~~.ids" }], getArray)).toBe(
            "/items?id%5B%5D=3&id%5B%5D=5"
        );
    });

    it("treats an empty array as an empty value", () => {
        const getArray = (path) => ({ none: [] })[path];

        expect(interpolateSegments(["/items", { param: "id", value: "~~.none" }], getArray)).toBe("/items");
        expect(interpolateSegments(["/items", { param: "id", value: "~~.none", required: true }], getArray)).toBeNull();
    });

    it("names the caller and the empty part in the warning", () => {
        interpolateSegments(["/items/", { segment: "~~.missing", required: true }], getter, { label: "redirectNow" });

        expect(console.warn).toHaveBeenCalledWith('redirectNow: required segment "~~.missing" (part 1) is empty — aborting URL.');
    });

    it("accepts the resolver as third argument, as in 2.10.0", () => {
        expect(interpolateSegments(["/items/", "~.slug"], undefined, (ref) => (ref === "~.slug" ? "hello" : ref))).toBe(
            "/items/hello"
        );
    });

    it("starts the query string, or continues the one of the path", () => {
        expect(interpolateSegments(["/items", { param: "id", value: "~~.id" }], getter)).toBe("/items?id=7");
        expect(interpolateSegments(["/items?sort=asc", { param: "id", value: "~~.id" }], getter)).toBe(
            "/items?sort=asc&id=7"
        );
    });
});

describe("interpolateSegmentsInContext", () => {
    const globalDataContext = { templatePath: "data", templateData: { display: "full", rows: [{ id: 3 }] } };
    const templateContext = { templatePath: "data.rows.0", templateData: { id: 3 } };
    const build = (segments) => interpolateSegmentsInContext({ segments, globalDataContext, templateContext });

    it("evaluates ~. in the template context and ~~. in the global data", () => {
        expect(build(["/rows/", "~.id", { param: "display", value: "~~.display" }])).toBe("/rows/3?display=full");
    });

    it("evaluates ~> references", () => {
        expect(build(["/rows/", "~>rows.0.id"])).toBe("/rows/3");
    });

    it("keeps the literal strings", () => {
        expect(build(["/static/path"])).toBe("/static/path");
    });
});
