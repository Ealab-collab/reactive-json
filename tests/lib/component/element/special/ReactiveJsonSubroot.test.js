/**
 * @jest-environment jsdom
 */
import { act } from "react";
import { renderRjBuild } from "../form/renderRjBuild.js";

const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;

/**
 * Types text in the middle of an input, like a user would: the DOM value and the caret change,
 * then the input event is dispatched.
 */
const typeAt = async (input, position, text) => {
    await act(async () => {
        input.focus();
        valueSetter.call(input, input.value.slice(0, position) + text + input.value.slice(position));
        input.setSelectionRange(position + text.length, position + text.length);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
};

describe("ReactiveJsonSubroot with sharedUpdates", () => {
    let rendered;

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
    });

    const rjBuild = {
        renderView: [
            {
                type: "ReactiveJsonSubroot",
                sharedUpdates: true,
                rjOptions: {
                    dataOverride: { form: "~~.form" },
                    maybeRawAppRjBuild: {
                        renderView: [{ type: "TextField", dataLocation: "~~.form.title" }],
                        data: {},
                    },
                },
            },
        ],
        data: { form: { title: "hello" } },
    };

    it("keeps the caret where the user types in a controlled field", async () => {
        rendered = await renderRjBuild(rjBuild);
        const input = rendered.container.querySelector("input");
        expect(input.value).toBe("hello");

        await typeAt(input, 2, "X");

        expect(input.value).toBe("heXllo");
        expect(input.selectionStart).toBe(3);
        expect(rendered.getData().form.title).toBe("heXllo");
    });

    it("keeps typing consistent over several keystrokes", async () => {
        rendered = await renderRjBuild(rjBuild);
        const input = rendered.container.querySelector("input");

        await typeAt(input, 1, "a");
        await typeAt(input, 2, "b");
        await typeAt(input, 3, "c");

        expect(input.value).toBe("habcello");
        expect(input.selectionStart).toBe(4);
        expect(rendered.getData().form.title).toBe("habcello");
    });

    it("shows a change of the shared data made by the parent", async () => {
        rendered = await renderRjBuild({
            ...rjBuild,
            renderView: [
                ...rjBuild.renderView,
                {
                    type: "button",
                    content: "Reset",
                    actions: [{ what: "setData", on: "click", path: "~~.form.title", value: "reset" }],
                },
            ],
        });

        await rendered.click(rendered.container.querySelector("button"));

        expect(rendered.container.querySelector("input").value).toBe("reset");
    });

    describe("with positional fields in a list", () => {
        const listBuild = {
            renderView: [
                {
                    type: "ReactiveJsonSubroot",
                    sharedUpdates: true,
                    rjOptions: {
                        dataOverride: { rows: "~~.rows" },
                        maybeRawAppRjBuild: {
                            renderView: [{ type: "Switch", content: "~~.rows", singleOption: { load: "row" } }],
                            templates: {
                                row: {
                                    type: "div",
                                    content: [
                                        { type: "TextField", dataLocation: "~.label" },
                                        {
                                            type: "button",
                                            attributes: { class: "down" },
                                            content: "Down",
                                            actions: [
                                                { what: "moveData", on: "click", target: "currentTemplateData", increment: 1 },
                                            ],
                                        },
                                        {
                                            type: "button",
                                            attributes: { class: "remove" },
                                            content: "Remove",
                                            actions: [{ what: "removeData", on: "click", target: "currentTemplateData" }],
                                        },
                                    ],
                                },
                            },
                            data: {},
                        },
                    },
                },
            ],
            data: { rows: [{ label: "alpha" }, { label: "bravo" }, { label: "charlie" }] },
        };

        const inputs = () => [...rendered.container.querySelectorAll("input")];
        const labels = () => rendered.getData().rows.map((row) => row.label);

        it("keeps the caret and the values on their item after a move", async () => {
            rendered = await renderRjBuild(listBuild);

            await typeAt(inputs()[0], 2, "X");
            expect(inputs()[0].selectionStart).toBe(3);
            expect(labels()).toEqual(["alXpha", "bravo", "charlie"]);

            await rendered.click(rendered.container.querySelectorAll(".down")[0]);
            expect(inputs().map((input) => input.value)).toEqual(["bravo", "alXpha", "charlie"]);
            expect(labels()).toEqual(["bravo", "alXpha", "charlie"]);

            await typeAt(inputs()[1], 1, "Y");
            expect(inputs()[1].value).toBe("aYlXpha");
            expect(inputs()[1].selectionStart).toBe(2);
            expect(labels()).toEqual(["bravo", "aYlXpha", "charlie"]);
        });

        it("keeps the caret and the values on their item after a removal", async () => {
            rendered = await renderRjBuild(listBuild);

            await typeAt(inputs()[1], 0, "X");
            await rendered.click(rendered.container.querySelectorAll(".remove")[0]);
            expect(inputs().map((input) => input.value)).toEqual(["Xbravo", "charlie"]);
            expect(labels()).toEqual(["Xbravo", "charlie"]);

            await typeAt(inputs()[0], 3, "Y");
            expect(inputs()[0].value).toBe("XbrYavo");
            expect(inputs()[0].selectionStart).toBe(4);
            expect(labels()).toEqual(["XbrYavo", "charlie"]);
        });
    });
});
