/**
 * @jest-environment jsdom
 */
import { renderRjBuild } from "../form/renderRjBuild.js";

describe("PreformattedMarkup", () => {
    let rendered;

    beforeEach(() => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
        window.__pwn = [];
    });

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
        jest.restoreAllMocks();
    });

    const render = async (element, html) => {
        rendered = await renderRjBuild({
            renderView: [{ type: "PreformattedMarkup", content: "~~.html", ...element }],
            data: { html },
        });
        return rendered.container.querySelector("[data-testid='content']");
    };

    it("renders the allowed markup as before", async () => {
        const content = await render({}, "<p>Hello <strong>you</strong></p><ul><li>a</li></ul>");

        expect(content.innerHTML).toBe("<p>Hello <strong>you</strong></p><ul><li>a</li></ul>");
    });

    it("removes the script and style elements, which are not allowed by default", async () => {
        const content = await render({}, "<p>a</p><script>window.__pwn.push(1)</script><style>body{color:red}</style>");

        expect(content.innerHTML).toBe("<p>a</p>");
    });

    it("never renders a script, even when it is listed", async () => {
        const content = await render(
            { additionalAllowedTags: ["script", "style"] },
            "<script>window.__pwn.push(1)</script><style>p{color:red}</style>"
        );

        expect(content.innerHTML).toBe("<style>p{color:red}</style>");
    });

    it("removes the attributes that could run code", async () => {
        const content = await render(
            { additionalAllowedTags: ["a", "iframe"] },
            '<a href="javascript:window.__pwn.push(1)" title="t">link</a>' +
                '<a href="https://example.com">ok</a>' +
                '<iframe srcdoc="&lt;script&gt;parent.__pwn.push(2)&lt;/script&gt;" title="f"></iframe>'
        );

        expect(content.innerHTML).toBe(
            '<a title="t">link</a><a href="https://example.com">ok</a><iframe title="f"></iframe>'
        );
    });
});
