/**
 * @jest-environment jsdom
 */
import { renderRjBuild } from "./renderRjBuild.js";

const optionValues = (select) => [...select.querySelectorAll("option")].map((option) => option.value);
const optionLabels = (select) => [...select.querySelectorAll("option")].map((option) => option.textContent);

describe("SelectField", () => {
    let rendered;

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
    });

    it("evaluates the option values", async () => {
        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "SelectField",
                    dataLocation: "~~.form.owner",
                    options: [
                        { label: "Nobody", value: "" },
                        { label: "~~.me.name", value: "~~.me.id" },
                    ],
                },
            ],
            data: { me: { id: "u42", name: "Ada" }, form: {} },
        });
        const select = rendered.container.querySelector("select");

        expect(optionValues(select)).toEqual(["", "u42"]);
        expect(optionLabels(select)).toEqual(["Nobody", "Ada"]);

        await rendered.selectValue(select, "u42");
        expect(rendered.getData().form.owner).toBe("u42");
    });

    it("evaluates the option values in a Switch item context", async () => {
        rendered = await renderRjBuild({
            renderView: [{ type: "Switch", content: "~~.rows", singleOption: { load: "row" } }],
            templates: {
                row: {
                    type: "SelectField",
                    dataLocation: "~.choice",
                    options: [
                        { label: "None", value: "" },
                        { label: "~.name", value: "~.code" },
                    ],
                },
            },
            data: { rows: [{ name: "Alpha", code: "a" }, { name: "Beta", code: "b" }] },
        });
        const selects = [...rendered.container.querySelectorAll("select")];

        expect(selects.map(optionValues)).toEqual([
            ["", "a"],
            ["", "b"],
        ]);

        await rendered.selectValue(selects[1], "b");
        expect(rendered.getData().rows[1].choice).toBe("b");
        expect(rendered.getData().rows[0].choice).toBeUndefined();
    });

    it("maps dynamic options with optionMapping", async () => {
        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "SelectField",
                    dataLocation: "~~.form.stage",
                    dynamicOptions: "~~.stages",
                    optionMapping: { label: "~.title", value: "~.id" },
                },
            ],
            data: { stages: [{ id: "new", title: "New" }, { id: "won", title: "Won" }], form: {} },
        });
        const select = rendered.container.querySelector("select");

        expect(optionValues(select)).toEqual(["new", "won"]);
        expect(optionLabels(select)).toEqual(["New", "Won"]);

        await rendered.selectValue(select, "won");
        expect(rendered.getData().form.stage).toBe("won");
    });

    it("keeps the literal values and the boolean conversion", async () => {
        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "SelectField",
                    dataLocation: "~~.enabled",
                    options: [
                        { label: "Yes", value: true },
                        { label: "No", value: false },
                    ],
                },
            ],
            data: {},
        });
        const select = rendered.container.querySelector("select");

        expect(optionValues(select)).toEqual(["true", "false"]);

        await rendered.selectValue(select, "false");
        expect(rendered.getData().enabled).toBe(false);
    });
});
