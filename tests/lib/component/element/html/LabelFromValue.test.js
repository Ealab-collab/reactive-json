/**
 * @jest-environment jsdom
 */
import { renderRjBuild } from "../form/renderRjBuild.js";

describe("LabelFromValue", () => {
    let rendered;

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
    });

    const content = () => rendered.container.querySelector("[data-testid='content']").textContent;

    it("evaluates the option values", async () => {
        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "LabelFromValue",
                    dataLocation: "~~.owner",
                    options: [
                        { label: "Me", value: "~~.me.id" },
                        { label: "Someone else", value: "other" },
                    ],
                },
            ],
            data: { me: { id: "u42" }, owner: "u42" },
        });

        expect(content()).toBe("Me");
    });

    it("maps dynamic options with optionMapping", async () => {
        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "LabelFromValue",
                    dataLocation: "~~.stage",
                    dynamicOptions: "~~.stages",
                    optionMapping: { label: "~.title", value: "~.id" },
                },
            ],
            data: { stages: [{ id: "new", title: "New" }, { id: "won", title: "Won" }], stage: "won" },
        });

        expect(content()).toBe("Won");
    });

    it("keeps the literal values", async () => {
        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "LabelFromValue",
                    dataLocation: "~~.status",
                    options: [
                        { label: "Active", value: 1 },
                        { label: "Inactive", value: 2 },
                    ],
                },
            ],
            data: { status: 2 },
        });

        expect(content()).toBe("Inactive");
    });
});
