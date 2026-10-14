/**
 * @jest-environment jsdom
 */
import yaml from "js-yaml";
import { renderRjBuild } from "./renderRjBuild.js";

const checkboxes = (container) => [...container.querySelectorAll("input[type='checkbox']")];
const radios = (container) => [...container.querySelectorAll("input[type='radio']")];
const checkedStates = (inputs) => inputs.map((input) => input.checked);

describe("CheckBoxField", () => {
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

    describe("one CheckBoxField per Switch item", () => {
        // The natural YAML: one single-option field per item, all bound to the same array.
        const rjBuild = yaml.load(`
renderView:
  - type: Switch
    content: ~~.sessions
    singleOption: { load: sessionItem }
templates:
  sessionItem:
    - type: CheckBoxField
      dataLocation: ~~.lead.sessions
      options: [{ label: ~.label, value: ~.label }]
data:
  sessions: [{ label: "20 octobre" }, { label: "17 novembre" }, { label: "15 décembre" }]
  lead: { sessions: [] }
`);

        it("evaluates the option value in the item context", async () => {
            rendered = await renderRjBuild(rjBuild);
            const inputs = checkboxes(rendered.container);

            expect(inputs.map((input) => input.value)).toEqual(["20 octobre", "17 novembre", "15 décembre"]);
            expect(checkedStates(inputs)).toEqual([false, false, false]);
        });

        it("toggles each checkbox independently and stores an array", async () => {
            rendered = await renderRjBuild(rjBuild);

            await rendered.click(checkboxes(rendered.container)[1]);
            expect(checkedStates(checkboxes(rendered.container))).toEqual([false, true, false]);
            expect(rendered.getData().lead.sessions).toEqual(["17 novembre"]);

            await rendered.click(checkboxes(rendered.container)[0]);
            expect(checkedStates(checkboxes(rendered.container))).toEqual([true, true, false]);
            expect(rendered.getData().lead.sessions).toEqual(["17 novembre", "20 octobre"]);

            await rendered.click(checkboxes(rendered.container)[1]);
            expect(checkedStates(checkboxes(rendered.container))).toEqual([true, false, false]);
            expect(rendered.getData().lead.sessions).toEqual(["20 octobre"]);
        });

        it("does not warn when the shared data is an array", async () => {
            rendered = await renderRjBuild(rjBuild);

            expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("share the data location"));
        });

        it("warns when single-value fields with different values share a data location", async () => {
            rendered = await renderRjBuild({ ...rjBuild, data: { ...rjBuild.data, lead: {} } });

            const sharedWarnings = warnSpy.mock.calls.filter(([message]) =>
                String(message).includes("share the data location")
            );
            expect(sharedWarnings).toHaveLength(1);
            expect(sharedWarnings[0][0]).toContain("data.lead.sessions");
        });
    });

    describe("dynamicOptions", () => {
        it("maps any list shape with optionMapping, the item being the template context", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.lead.sessions",
                        dynamicOptions: "~~.sessions",
                        optionMapping: {
                            label: "~.label",
                            value: "~.label",
                            attributes: { class: "~.kind" },
                        },
                    },
                ],
                data: {
                    sessions: [
                        { label: "20 octobre", kind: "autumn" },
                        { label: "15 décembre", kind: "winter" },
                    ],
                    lead: { sessions: [] },
                },
            });
            const inputs = checkboxes(rendered.container);

            expect(inputs.map((input) => input.value)).toEqual(["20 octobre", "15 décembre"]);
            expect([...rendered.container.querySelectorAll("label")].map((label) => label.textContent)).toEqual([
                "20 octobre",
                "15 décembre",
            ]);
            expect(inputs.map((input) => input.parentElement.className)).toEqual(["autumn", "winter"]);

            await rendered.click(inputs[1]);
            expect(rendered.getData().lead.sessions).toEqual(["15 décembre"]);
        });

        it("keeps the multiple mode when a dynamic list has a single item and the data is an array", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.lead.sessions",
                        dynamicOptions: "~~.sessions",
                        optionMapping: { label: "~.label", value: "~.label" },
                    },
                ],
                data: { sessions: [{ label: "20 octobre" }], lead: { sessions: [] } },
            });

            await rendered.click(checkboxes(rendered.container)[0]);
            expect(rendered.getData().lead.sessions).toEqual(["20 octobre"]);

            await rendered.click(checkboxes(rendered.container)[0]);
            expect(rendered.getData().lead.sessions).toEqual([]);
        });

        it("uses scalar items as both label and value", async () => {
            rendered = await renderRjBuild({
                renderView: [{ type: "CheckBoxField", dataLocation: "~~.picked", dynamicOptions: "~~.choices" }],
                data: { choices: ["red", "green"], picked: [] },
            });
            const inputs = checkboxes(rendered.container);

            expect(inputs.map((input) => input.value)).toEqual(["red", "green"]);

            await rendered.click(inputs[1]);
            expect(rendered.getData().picked).toEqual(["green"]);
        });

        it("renders the options once a list that started empty is filled", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    { type: "CheckBoxField", dataLocation: "~~.picked", dynamicOptions: "~~.choices" },
                    {
                        type: "button",
                        content: "Load",
                        actions: [{ what: "setData", on: "click", path: "~~.choices", value: ["red", "green"] }],
                    },
                ],
                data: { choices: [], picked: [] },
            });

            expect(checkboxes(rendered.container)).toHaveLength(0);

            await rendered.click(rendered.container.querySelector("button"));
            expect(checkboxes(rendered.container).map((input) => input.value)).toEqual(["red", "green"]);
        });
    });

    describe("unchanged behaviors", () => {
        it("keeps a single boolean checkbox as true / false", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.agree",
                        options: [{ label: "I agree", value: true }],
                    },
                ],
                data: {},
            });
            const input = () => checkboxes(rendered.container)[0];

            expect(input().checked).toBe(false);

            await rendered.click(input());
            expect(input().checked).toBe(true);
            expect(rendered.getData().agree).toBe(true);

            await rendered.click(input());
            expect(input().checked).toBe(false);
            expect(rendered.getData().agree).toBe(false);
        });

        it("keeps a single checkbox with a literal value as value / false", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.newsletter",
                        options: [{ label: "Newsletter", value: "weekly" }],
                    },
                ],
                data: { newsletter: false },
            });

            await rendered.click(checkboxes(rendered.container)[0]);
            expect(rendered.getData().newsletter).toBe("weekly");

            await rendered.click(checkboxes(rendered.container)[0]);
            expect(rendered.getData().newsletter).toBe(false);
        });

        it("keeps a multiple checkbox group with literal values", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.interests",
                        options: [
                            { label: "Tech", value: "tech" },
                            { label: "Music", value: "music" },
                        ],
                    },
                ],
                data: {},
            });

            await rendered.click(checkboxes(rendered.container)[1]);
            expect(rendered.getData().interests).toEqual(["music"]);
        });

        it("keeps the radio group storing a single value", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.size",
                        controlType: "radio",
                        options: [
                            { label: "Small", value: "s" },
                            { label: "Medium", value: "m" },
                            { label: "Large", value: "l" },
                        ],
                    },
                ],
                data: { size: "s" },
            });

            expect(checkedStates(radios(rendered.container))).toEqual([true, false, false]);

            await rendered.click(radios(rendered.container)[2]);
            expect(checkedStates(radios(rendered.container))).toEqual([false, false, true]);
            expect(rendered.getData().size).toBe("l");
        });
    });

    describe("accessibility", () => {
        it("exposes a labelled group when a label is shown above several options", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.interests",
                        label: "Interests",
                        options: [
                            { label: "Tech", value: "tech" },
                            { label: "Music", value: "music" },
                        ],
                    },
                ],
                data: { interests: [] },
            });
            const group = rendered.container.querySelector("[role='group']");

            expect(group).not.toBeNull();
            expect(group.querySelectorAll("input[type='checkbox']")).toHaveLength(2);

            const groupLabel = rendered.container.querySelector(`[id='${group.getAttribute("aria-labelledby")}']`);
            expect(groupLabel.textContent).toBe("Interests");
        });

        it("gives the radios of a field a common name", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.size",
                        controlType: "radio",
                        label: "Size",
                        options: [
                            { label: "Small", value: "s" },
                            { label: "Large", value: "l" },
                        ],
                    },
                ],
                data: {},
            });
            const names = radios(rendered.container).map((input) => input.name);

            expect(names[0]).not.toBe("");
            expect(names[1]).toBe(names[0]);
        });

        it("labels a single checkbox with the field label when the option has no label", async () => {
            rendered = await renderRjBuild({
                renderView: [
                    {
                        type: "CheckBoxField",
                        dataLocation: "~~.agree",
                        label: "I agree",
                        options: [{ value: true }],
                    },
                ],
                data: {},
            });
            const input = checkboxes(rendered.container)[0];
            const label = rendered.container.querySelector("label");

            expect(label.getAttribute("for")).toBe(input.id);
            expect(rendered.container.querySelector("[role='group']")).toBeNull();
        });
    });
});
