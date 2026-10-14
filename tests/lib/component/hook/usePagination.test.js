/**
 * @jest-environment jsdom
 */
import { renderRjBuild } from "../element/form/renderRjBuild.js";

const items = (count) => Array.from({ length: count }, (_, index) => ({ name: `item${index + 1}` }));

const rjBuild = {
    renderView: [
        {
            type: "Switch",
            content: "~~.shown",
            paginated: true,
            paginationProps: { pageMaxItemCount: 2 },
            singleOption: { load: "item" },
            after: { type: "PageControls" },
        },
        {
            type: "button",
            attributes: { class: "filter" },
            content: "Filter",
            actions: [{ what: "setData", on: "click", path: "~~.shown", value: "~~.filtered" }],
        },
        {
            type: "button",
            attributes: { class: "reset" },
            content: "Reset",
            actions: [{ what: "setData", on: "click", path: "~~.shown", value: "~~.all" }],
        },
    ],
    templates: { item: { type: "span", attributes: { class: "item" }, content: "~.name" } },
    data: { all: items(6), filtered: items(1), shown: items(6) },
};

describe("usePagination", () => {
    let rendered;

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
    });

    const shownItems = () => [...rendered.container.querySelectorAll(".item")].map((item) => item.textContent);
    const pageButton = (label) =>
        [...rendered.container.querySelectorAll("nav button")].find((button) => button.textContent === label);
    const activePage = () => rendered.container.querySelector("nav button[aria-current='page']")?.textContent;

    it("shows the items of the last page when the content shrinks below the active page", async () => {
        rendered = await renderRjBuild(rjBuild);

        await rendered.click(pageButton("3"));
        expect(shownItems()).toEqual(["item5", "item6"]);

        await rendered.click(rendered.container.querySelector(".filter"));
        expect(shownItems()).toEqual(["item1"]);
    });

    it("comes back to the remembered page when the content grows again", async () => {
        rendered = await renderRjBuild(rjBuild);

        await rendered.click(pageButton("3"));
        await rendered.click(rendered.container.querySelector(".filter"));
        await rendered.click(rendered.container.querySelector(".reset"));

        expect(shownItems()).toEqual(["item5", "item6"]);
        expect(activePage()).toBe("3");
    });

    it("navigates from the displayed page when the content has fewer pages than the remembered one", async () => {
        rendered = await renderRjBuild({ ...rjBuild, data: { ...rjBuild.data, filtered: items(3) } });

        await rendered.click(pageButton("3"));
        await rendered.click(rendered.container.querySelector(".filter"));
        expect(shownItems()).toEqual(["item3"]);
        expect(activePage()).toBe("2");

        await rendered.click(rendered.container.querySelector("nav button[aria-label='Go to previous page']"));
        expect(shownItems()).toEqual(["item1", "item2"]);
        expect(activePage()).toBe("1");
    });
});
