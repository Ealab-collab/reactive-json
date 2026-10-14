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
});
