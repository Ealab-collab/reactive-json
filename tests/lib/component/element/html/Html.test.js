/**
 * @jest-environment jsdom
 */
import { renderRjBuild } from "../form/renderRjBuild.js";

const toggleWarnings = (warnSpy) =>
    warnSpy.mock.calls.filter(([message]) => String(message).includes("always stays unchecked"));

describe("Html checkbox and radio inputs", () => {
    let warnSpy;
    let rendered;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
        warnSpy.mockRestore();
    });

    const toggleAction = { what: "setData", on: "change", path: "~~.flag", value: true };

    it("warns once when a checkbox has event reactions but no checked binding", async () => {
        rendered = await renderRjBuild({
            renderView: [{ type: "Switch", content: "~~.rows", singleOption: { load: "row" } }],
            templates: {
                row: [{ type: "input", attributes: { type: "checkbox" }, actions: [toggleAction] }],
            },
            data: { rows: [{}, {}, {}] },
        });

        expect(toggleWarnings(warnSpy)).toHaveLength(1);
        expect(toggleWarnings(warnSpy)[0][0]).toContain('type="checkbox"');
    });

    it("keeps the unbound checkbox unchecked", async () => {
        rendered = await renderRjBuild({
            renderView: [{ type: "input", attributes: { type: "checkbox" }, actions: [toggleAction] }],
            data: {},
        });
        const input = rendered.container.querySelector("input");

        await rendered.click(input);
        expect(rendered.getData().flag).toBe(true);
        expect(input.checked).toBe(false);
    });

    it("does not warn when checked is bound to the data", async () => {
        rendered = await renderRjBuild({
            renderView: [
                { type: "input", attributes: { type: "checkbox", checked: "~~.flag" }, actions: [toggleAction] },
            ],
            data: { flag: false },
        });

        expect(toggleWarnings(warnSpy)).toHaveLength(0);

        await rendered.click(rendered.container.querySelector("input"));
        expect(rendered.container.querySelector("input").checked).toBe(true);
    });

    it("does not warn when an attribute transform sets checked", async () => {
        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "input",
                    attributes: { type: "radio" },
                    attributeTransforms: [
                        { what: "setAttributeValue", name: "checked", value: true, when: "~~.flag", is: true },
                    ],
                    actions: [toggleAction],
                },
            ],
            data: { flag: false },
        });

        expect(toggleWarnings(warnSpy)).toHaveLength(0);
    });

    it("does not warn for a checkbox without event reactions", async () => {
        rendered = await renderRjBuild({
            renderView: [{ type: "input", attributes: { type: "checkbox", disabled: true } }],
            data: {},
        });

        expect(toggleWarnings(warnSpy)).toHaveLength(0);
    });
});
