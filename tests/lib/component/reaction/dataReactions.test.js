/**
 * @jest-environment jsdom
 */
import { renderRjBuild } from "../element/form/renderRjBuild.js";

/**
 * Builds a RjBuild with one button per given actions list.
 */
const withButtons = (buttons, data, extra = {}) => ({
    renderView: Object.entries(buttons).map(([name, actions]) => ({
        type: "button",
        attributes: { class: name },
        content: name,
        actions: actions.map((action) => ({ on: "click", ...action })),
    })),
    data,
    ...extra,
});

describe("data reactions", () => {
    let rendered;
    let warnSpy;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
        warnSpy.mockRestore();
    });

    const press = (name) => rendered.click(rendered.container.querySelector(`.${name}`));

    describe("toggleData", () => {
        it("adds an absent value, removes a present one, and keeps the other values", async () => {
            rendered = await renderRjBuild(
                withButtons({ toggle: [{ what: "toggleData", path: "~~.picked", value: "b" }] }, { picked: ["a"] })
            );

            await press("toggle");
            expect(rendered.getData().picked).toEqual(["a", "b"]);

            await press("toggle");
            expect(rendered.getData().picked).toEqual(["a"]);
        });

        it("treats a missing or non-array location as an empty array", async () => {
            rendered = await renderRjBuild(
                withButtons(
                    {
                        missing: [{ what: "toggleData", path: "~~.missing", value: "x" }],
                        scalar: [{ what: "toggleData", path: "~~.scalar", value: "x" }],
                    },
                    { scalar: "not an array" }
                )
            );

            await press("missing");
            await press("scalar");
            expect(rendered.getData().missing).toEqual(["x"]);
            expect(rendered.getData().scalar).toEqual(["x"]);
        });

        it("compares the values as strings", async () => {
            rendered = await renderRjBuild(
                withButtons({ toggle: [{ what: "toggleData", path: "~~.ids", value: "~~.userId" }] }, {
                    ids: ["12", "30"],
                    userId: 12,
                })
            );

            await press("toggle");
            expect(rendered.getData().ids).toEqual(["30"]);
        });

        it("does nothing when the value is empty", async () => {
            rendered = await renderRjBuild(
                withButtons(
                    {
                        missing: [{ what: "toggleData", path: "~~.ids", value: "~~.notLoaded" }],
                        empty: [{ what: "toggleData", path: "~~.ids", value: "" }],
                    },
                    { ids: ["1"] }
                )
            );

            await press("missing");
            await press("empty");
            expect(rendered.getData().ids).toEqual(["1"]);
        });

        it("toggles the value of the current Switch item", async () => {
            rendered = await renderRjBuild({
                renderView: [{ type: "Switch", content: "~~.rows", singleOption: { load: "row" } }],
                templates: {
                    row: {
                        type: "button",
                        content: "~.id",
                        actions: [{ what: "toggleData", on: "click", path: "~~.selection", value: "~.id" }],
                    },
                },
                data: { rows: [{ id: 1 }, { id: 2 }, { id: 3 }], selection: [] },
            });
            const buttons = [...rendered.container.querySelectorAll("button")];

            await rendered.click(buttons[2]);
            await rendered.click(buttons[0]);
            expect(rendered.getData().selection).toEqual([3, 1]);
        });
    });

    describe("collectField", () => {
        it("writes the field of every item, skipping the non-objects and the empty fields", async () => {
            rendered = await renderRjBuild(
                withButtons({ all: [{ what: "collectField", from: "~~.rows", field: "nid", path: "~~.selection" }] }, {
                    rows: [{ nid: 4 }, "not an object", { nid: null }, { title: "no nid" }, { nid: "" }, { nid: 9 }],
                    selection: [],
                })
            );

            await press("all");
            expect(rendered.getData().selection).toEqual([4, 9]);
        });

        it("writes an empty array when the collection is not an array", async () => {
            rendered = await renderRjBuild(
                withButtons(
                    { all: [{ what: "collectField", from: "~~.missing", field: "nid", path: "~~.selection" }] },
                    { selection: [1] }
                )
            );

            await press("all");
            expect(rendered.getData().selection).toEqual([]);
        });
    });

    describe("stringifyData", () => {
        it("writes the JSON representation of the value", async () => {
            rendered = await renderRjBuild(
                withButtons(
                    {
                        save: [{ what: "stringifyData", from: "~~.widgets", path: "~~.payload.layout" }],
                        missing: [{ what: "stringifyData", from: "~~.missing", path: "~~.payload.other" }],
                    },
                    { widgets: [{ id: "a", w: 2 }], payload: {} }
                )
            );

            await press("save");
            await press("missing");
            expect(rendered.getData().payload).toEqual({ layout: '[{"id":"a","w":2}]', other: "" });
        });
    });

    describe("joinData", () => {
        it("writes the string built from the parts, with references in the item context", async () => {
            rendered = await renderRjBuild({
                renderView: [{ type: "Switch", content: "~~.rows", singleOption: { load: "row" } }],
                templates: {
                    row: {
                        type: "button",
                        content: "~.id",
                        actions: [
                            {
                                what: "joinData",
                                on: "click",
                                path: "~~.url",
                                parts: ["/api/save?id=", "~.id", { param: "display", value: "~~.display" }],
                            },
                        ],
                    },
                },
                data: { rows: [{ id: 7 }, { id: 8 }], display: "full" },
            });

            await rendered.click(rendered.container.querySelectorAll("button")[1]);
            expect(rendered.getData().url).toBe("/api/save?id=8&display=full");
        });

        it("cancels the write when a required segment is empty", async () => {
            rendered = await renderRjBuild(
                withButtons(
                    {
                        join: [
                            {
                                what: "joinData",
                                path: "~~.url",
                                parts: ["/api/save?id=", { segment: "~~.id", required: true }],
                            },
                        ],
                    },
                    { url: "unchanged" }
                )
            );

            await press("join");
            expect(rendered.getData().url).toBe("unchanged");
        });

        it("writes an empty string for an empty reference that is not required", async () => {
            rendered = await renderRjBuild(
                withButtons({ join: [{ what: "joinData", path: "~~.label", parts: ["Session ", "~~.date"] }] }, {})
            );

            await press("join");
            expect(rendered.getData().label).toBe("Session ");
        });
    });

    describe("setClipboardData", () => {
        const clipboardBuild = withButtons(
            { copy: [{ what: "setClipboardData", value: "~~.secret", statusPath: "~~.copyStatus" }] },
            { secret: "s3cr3t" }
        );

        afterEach(() => {
            delete navigator.clipboard;
            delete document.execCommand;
        });

        it("reports a successful copy", async () => {
            const writeText = jest.fn(() => Promise.resolve());
            Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

            rendered = await renderRjBuild(clipboardBuild);
            await press("copy");

            expect(writeText).toHaveBeenCalledWith("s3cr3t");
            expect(rendered.getData().copyStatus).toBe("copied");
        });

        it("falls back to the copy command when the clipboard API is not available", async () => {
            document.execCommand = jest.fn(() => true);

            rendered = await renderRjBuild(clipboardBuild);
            await press("copy");

            expect(document.execCommand).toHaveBeenCalledWith("copy");
            expect(rendered.getData().copyStatus).toBe("copied");
        });

        it("reports a failed copy", async () => {
            const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
            const writeText = jest.fn(() => Promise.reject(new Error("denied")));
            Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
            document.execCommand = jest.fn(() => false);

            rendered = await renderRjBuild(clipboardBuild);
            await press("copy");

            expect(rendered.getData().copyStatus).toBe("failed");
            errorSpy.mockRestore();
        });
    });

    describe("printPage", () => {
        it("opens the print dialog", async () => {
            const print = jest.spyOn(window, "print").mockImplementation(() => {});

            rendered = await renderRjBuild(withButtons({ print: [{ what: "printPage" }] }, {}));
            await press("print");

            expect(print).toHaveBeenCalledTimes(1);
            print.mockRestore();
        });
    });
});

describe("URL attributes built from segments", () => {
    let rendered;

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
    });

    it("builds the href of each Switch item", async () => {
        rendered = await renderRjBuild({
            renderView: [{ type: "Switch", content: "~~.articles", singleOption: { load: "link" } }],
            templates: {
                link: {
                    type: "a",
                    attributes: { href: ["/article/", "~.year", "/", "~.slug"] },
                    content: "~.slug",
                },
            },
            data: { articles: [{ year: 2026, slug: "hello" }, { year: 2025, slug: "world" }] },
        });

        expect([...rendered.container.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
            "/article/2026/hello",
            "/article/2025/world",
        ]);
    });

    it("omits the attribute when a required segment is empty", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

        rendered = await renderRjBuild({
            renderView: [
                {
                    type: "a",
                    attributes: { href: ["/article/", { segment: "~~.slug", required: true }] },
                    content: "Read",
                },
            ],
            data: {},
        });

        expect(rendered.container.querySelector("a").hasAttribute("href")).toBe(false);
        warnSpy.mockRestore();
    });

    it("keeps the other attributes as they are", async () => {
        rendered = await renderRjBuild({
            renderView: [{ type: "a", attributes: { href: "~~.url", class: "~~.css" }, content: "Read" }],
            data: { url: "/plain", css: "link" },
        });
        const link = rendered.container.querySelector("a");

        expect(link.getAttribute("href")).toBe("/plain");
        expect(link.className).toBe("link");
    });
});
