/**
 * @jest-environment jsdom
 */
import { ReactiveJsonBasicComponentWrapper } from "../../../../../lib/component/element/special/ReactiveJsonBasicComponentWrapper.jsx";
import { renderRjBuild } from "../form/renderRjBuild.js";

const pwn = (id) => `window.__pwn.push('${id}')`;

// Renders the element named by its "as" or "component" prop, like the react-bootstrap and MUI components.
const PolymorphicComponent = ({ as, component, children, ...rest }) => {
    const Element = as ?? component ?? "div";
    return <Element {...rest}>{children}</Element>;
};

// Registered like a host application would, declaring the props that pick the element.
const polymorphicPlugins = {
    element: {
        Polymorphic: (props) => (
            <ReactiveJsonBasicComponentWrapper
                {...props}
                reactComponent={PolymorphicComponent}
                componentPolicy={{ elementTypeProps: { as: "div", component: "div" } }}
            />
        ),
    },
};

describe("Html markup security", () => {
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

    const render = async (rjBuild, options) => {
        rendered = await renderRjBuild(rjBuild, options);
        return rendered.container.querySelector("[data-testid='content']");
    };

    // Lists the attributes of every element of the rendered content.
    const allAttributes = (content) =>
        Array.from(content.querySelectorAll("*")).flatMap((element) =>
            Array.from(element.attributes).map(
                (attribute) => `${element.localName} ${attribute.name}="${attribute.value}"`
            )
        );

    describe("elements", () => {
        it("does not render a script, whatever its casing", async () => {
            const content = await render({
                renderView: [
                    { type: "script", content: pwn("lower") },
                    { type: "SCRIPT", content: pwn("upper") },
                    { type: "Html", tag: "Script", content: pwn("html") },
                    { type: "svg", content: [{ type: "script", content: pwn("svg") }] },
                ],
            });

            expect(content.querySelectorAll("script")).toHaveLength(0);
            expect(window.__pwn).toEqual([]);
            expect(content.querySelector("svg")).not.toBeNull();
        });

        it("does not render the other refused elements", async () => {
            const content = await render({
                renderView: [
                    { type: "object", attributes: { data: "/doc.svg" } },
                    { type: "embed", attributes: { src: "/doc.svg" } },
                    { type: "base", attributes: { href: "https://example.com/" } },
                    { type: "frameset", content: [{ type: "frame", attributes: { src: "/x" } }] },
                    { type: "noscript", content: "x" },
                    { type: "xmp", content: "x" },
                ],
            });

            expect(content.innerHTML).toBe("");
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("<base> element is not rendered"));
        });

        it("renders the regular elements as before", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "div",
                        attributes: { class: "box", "data-id": "1" },
                        content: [{ type: "p", content: "Hello" }],
                    },
                    { type: "a", attributes: { href: "/page", target: "_blank", rel: "noopener" }, content: "link" },
                    { type: "x-card", attributes: { variant: "large" }, content: "card" },
                ],
            });

            expect(content.innerHTML).toBe(
                '<div class="box" data-id="1"><p>Hello</p></div>' +
                    '<a href="/page" target="_blank" rel="noopener">link</a>' +
                    '<x-card variant="large">card</x-card>'
            );
        });
    });

    describe("attributes", () => {
        it("removes the event handler strings, in any case and on custom elements", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "x-card",
                        attributes: { ONCLICK: pwn(1), onSecurityPolicyViolation: pwn(2) },
                        content: "a",
                    },
                    { type: "div", attributes: { ONCLICK: pwn(3), onmouseover: pwn(4) }, content: "b" },
                    { type: "img", attributes: { src: "x", ONERROR: pwn(5) } },
                ],
            });

            expect(allAttributes(content).filter((attribute) => / on/.test(attribute))).toEqual([]);

            for (const element of content.querySelectorAll("*")) {
                element.dispatchEvent(new Event("click"));
                element.dispatchEvent(new Event("error"));
            }

            expect(window.__pwn).toEqual([]);
        });

        it("keeps the event reactions", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "button",
                        content: "go",
                        actions: [{ what: "setData", on: "click", path: "~~.clicked", value: true }],
                    },
                ],
                data: { clicked: false },
            });

            await rendered.click(content.querySelector("button"));
            expect(rendered.getData().clicked).toBe(true);
        });

        it("removes the javascript: URLs, in any case", async () => {
            const content = await render({
                renderView: [
                    { type: "a", attributes: { HREF: "javascript:" + pwn(1) }, content: "a" },
                    { type: "iframe", attributes: { SRC: "javascript:parent." + pwn(2) } },
                    {
                        type: "form",
                        attributes: { ACTION: "java\tscript:x" },
                        content: [{ type: "button", attributes: { FORMACTION: "javascript:x" }, content: "b" }],
                    },
                    {
                        type: "svg",
                        content: [
                            {
                                type: "a",
                                attributes: { xlinkHref: "javascript:x", "xlink:href": "javascript:x" },
                                content: "c",
                            },
                        ],
                    },
                    { type: "a", attributes: { href: "~~.url" }, content: "d" },
                ],
                data: { url: " JAVASCRIPT:" + pwn(3) },
            });

            expect(allAttributes(content).filter((attribute) => /javascript/i.test(attribute))).toEqual([]);
            expect(window.__pwn).toEqual([]);
        });

        it("keeps the safe URLs", async () => {
            const content = await render({
                renderView: [
                    { type: "a", attributes: { href: "https://example.com/a" }, content: "a" },
                    { type: "a", attributes: { href: "mailto:a@example.com" }, content: "b" },
                    { type: "a", attributes: { href: "tel:+33102030405" }, content: "c" },
                    { type: "a", attributes: { href: ["/articles/", "~~.slug"] }, content: "d" },
                    { type: "img", attributes: { src: "data:image/png;base64,iVBORw0KGgo=", alt: "" } },
                    { type: "iframe", attributes: { src: "~~.video", title: "Video" } },
                ],
                data: { slug: "hello", video: "https://www.youtube-nocookie.com/embed/x" },
            });

            expect(Array.from(content.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
                "https://example.com/a",
                "mailto:a@example.com",
                "tel:+33102030405",
                "/articles/hello",
            ]);
            expect(content.querySelector("img").getAttribute("src")).toBe("data:image/png;base64,iVBORw0KGgo=");
            expect(content.querySelector("iframe").getAttribute("src")).toBe(
                "https://www.youtube-nocookie.com/embed/x"
            );
        });

        it("removes srcdoc and dangerouslySetInnerHTML", async () => {
            const content = await render({
                renderView: [
                    { type: "iframe", attributes: { srcDoc: "<script>parent." + pwn(1) + "</script>" } },
                    { type: "iframe", attributes: { SRCDOC: "<script>parent." + pwn(2) + "</script>" } },
                    {
                        type: "div",
                        attributes: { dangerouslySetInnerHTML: { __html: '<img src="x" onerror="' + pwn(3) + '">' } },
                    },
                ],
            });

            expect(content.innerHTML).toBe("<iframe></iframe><iframe></iframe><div></div>");
        });

        it("checks the attributes set by the attribute transforms", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "x-card",
                        content: "a",
                        attributeTransforms: [
                            { what: "setAttributeValue", name: "ONCLICK", value: pwn(1), mode: "replace" },
                        ],
                    },
                    {
                        type: "a",
                        attributes: { href: "/crm/contacts/" },
                        content: "b",
                        attributeTransforms: [
                            { what: "setAttributeValue", name: "href", value: "~~.id", mode: "append", separator: "" },
                            { what: "setAttributeValue", name: "class", value: "active" },
                        ],
                    },
                    {
                        type: "a",
                        content: "c",
                        attributeTransforms: [
                            { what: "setAttributeValue", name: "HREF", value: "~~.evil", mode: "replace" },
                        ],
                    },
                ],
                data: { id: 12, evil: "javascript:" + pwn(2) },
            });

            expect(content.querySelector("x-card").attributes).toHaveLength(0);
            expect(content.querySelectorAll("a")[0].outerHTML).toBe('<a href="/crm/contacts/12" class="active">b</a>');
            expect(content.querySelectorAll("a")[1].attributes).toHaveLength(0);
        });

        it("removes the animations of a link target and the http-equiv of a meta", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "svg",
                        content: [
                            {
                                type: "a",
                                content: [{ type: "set", attributes: { attributeName: "href", to: "javascript:x" } }],
                            },
                            { type: "animate", attributes: { attributeName: "opacity", from: "0", to: "1" } },
                        ],
                    },
                    { type: "meta", attributes: { itemProp: "name", content: "Orbit", httpEquiv: "refresh" } },
                ],
            });

            expect(content.querySelector("set").getAttribute("attributeName")).toBeNull();
            expect(content.querySelector("animate").getAttribute("attributeName")).toBe("opacity");
            expect(content.querySelector("meta").outerHTML).toBe('<meta itemprop="name" content="Orbit">');
        });

        it("removes the event handler strings of the form fields", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "TextField",
                        label: "Name",
                        dataLocation: "~~.name",
                        inputAttributes: { ONFOCUS: pwn(1), "aria-describedby": "help" },
                        labelAttributes: { onmouseover: pwn(2), class: "label" },
                    },
                ],
                data: { name: "" },
            });

            expect(allAttributes(content).filter((attribute) => / on/.test(attribute))).toEqual([]);
            expect(content.querySelector("input").getAttribute("aria-describedby")).toBe("help");
            expect(content.querySelector("label").getAttribute("class")).toBe("label");
        });

        it("keeps the as of a preloaded resource on a link", async () => {
            await render({
                renderView: [
                    { type: "link", attributes: { rel: "preload", as: "script", href: "/preloaded.js" } },
                    { type: "link", attributes: { rel: "preload", as: "~~.kind", href: "/preloaded.css" } },
                ],
                data: { kind: "style" },
            });

            // React hoists the preloads to the head of the document.
            const asOf = (href) => document.head.querySelector(`link[href="${href}"]`)?.getAttribute("as");
            expect(asOf("/preloaded.js")).toBe("script");
            expect(asOf("/preloaded.css")).toBe("style");
        });
    });

    describe("wrapped components with a policy", () => {
        it("does not let a component render a refused element through as or component", async () => {
            const content = await render(
                {
                    renderView: [
                        { type: "Polymorphic", attributes: { as: "SCRIPT" }, content: "~~.payload" },
                        { type: "Polymorphic", attributes: { as: "~~.tag" }, content: pwn("as from data") },
                        { type: "Polymorphic", attributes: { component: "script" }, content: pwn("component") },
                    ],
                    data: { payload: pwn("payload from data"), tag: "Script" },
                },
                { plugins: polymorphicPlugins }
            );

            expect(content.querySelectorAll("script")).toHaveLength(0);
            expect(window.__pwn).toEqual([]);
            // The component renders its default element instead.
            expect(content.querySelectorAll("div")).toHaveLength(3);
        });

        it("does not let a component render a raw text element through as", async () => {
            const content = await render(
                {
                    renderView: [{ type: "Polymorphic", attributes: { as: "style" }, content: "~~.css" }],
                    data: { css: 'a{}</style><img src="x" onerror="' + pwn(1) + '">' },
                },
                { plugins: polymorphicPlugins }
            );

            expect(content.querySelector("style")).toBeNull();
        });

        it("keeps the regular element types", async () => {
            const content = await render(
                {
                    renderView: [
                        { type: "Polymorphic", attributes: { as: "section", class: "card" }, content: "a" },
                        { type: "Polymorphic", attributes: { component: "~~.tag" }, content: "b" },
                    ],
                    data: { tag: "nav" },
                },
                { plugins: polymorphicPlugins }
            );

            expect(content.innerHTML).toBe('<section class="card">a</section><nav>b</nav>');
        });

        it("applies the rules of the element rendered through as", async () => {
            const content = await render(
                {
                    renderView: [
                        {
                            type: "svg",
                            content: [
                                {
                                    type: "a",
                                    content: [
                                        {
                                            type: "Polymorphic",
                                            attributes: { as: "set", attributeName: "href", to: "~~.url" },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    data: { url: "javascript:" + pwn(1) },
                },
                { plugins: polymorphicPlugins }
            );

            expect(content.querySelector("set").getAttribute("attributeName")).toBeNull();
        });
    });

    describe("raw text elements", () => {
        it("renders a style sheet unchanged", async () => {
            const css = '.a > .b { color: red; } .c::before { content: "<"; }';
            const content = await render({
                renderView: [
                    { type: "style", content: css },
                    { type: "style", content: "~~.css" },
                ],
                data: { css: ".d { top: 0; }" },
            });

            const styles = content.querySelectorAll("style");
            expect(styles[0].textContent).toBe(css);
            expect(styles[1].textContent).toBe(".d { top: 0; }");
        });

        it("prevents a style sheet from closing its element", async () => {
            const content = await render({
                renderView: [{ type: "style", content: "~~.css" }],
                data: { css: 'a{}</style><img src="x" onerror="' + pwn(1) + '">' },
            });

            // A prerendered page serializes the DOM, then the browser parses it again.
            const parsed = document.createElement("div");
            parsed.innerHTML = content.innerHTML;

            expect(parsed.querySelector("img")).toBeNull();
            expect(parsed.querySelector("style").textContent).toContain("<\\/style>");
        });

        it("evaluates each item of a style sheet given as an array", async () => {
            const content = await render({
                renderView: [
                    { type: "style", content: [".a { top: 0; }", "~~.css", "~~.missing", 1, "~~.parts"] },
                    { type: "style", content: ["a{}", "~~.evil"] },
                ],
                data: { css: ".b { top: 1px; }", parts: [".c{}", "~~.css"], evil: "</style><img src=x>" },
            });

            const styles = content.querySelectorAll("style");
            // The items of an array given by a template value are not evaluated.
            expect(styles[0].textContent).toBe(".a { top: 0; }.b { top: 1px; }1.c{}~~.css");
            expect(styles[1].textContent).toBe("a{}<\\/style><img src=x>");
        });

        it("does not render a style element whose content is not text", async () => {
            const content = await render({
                renderView: [{ type: "style", content: [{ type: "span", content: "a" }] }],
            });

            expect(content.innerHTML).toBe("<style></style>");
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("must be text"));
        });

        it("does not render the content of an iframe", async () => {
            const content = await render({
                renderView: [{ type: "iframe", attributes: { title: "Map" }, content: "~~.fallback" }],
                data: { fallback: '</iframe><img src="x" onerror="' + pwn(1) + '">' },
            });

            expect(content.innerHTML).toBe('<iframe title="Map"></iframe>');
        });
    });

    describe("Switch content wrapper", () => {
        const switchOf = (contentWrapper) => ({
            renderView: [{ type: "Switch", content: "~~.rows", singleOption: { load: "row" }, contentWrapper }],
            templates: { row: { type: "span", content: "~.label" } },
            data: { rows: [{ label: "a" }, { label: "b" }] },
        });

        it("keeps a regular wrapper", async () => {
            const content = await render(switchOf({ tag: "ul", attributes: { class: "list" } }));

            expect(content.querySelector("ul.list").textContent).toBe("ab");
        });

        it("does not wrap the content in a refused or raw text element", async () => {
            const scriptWrapped = await render(switchOf({ tag: "SCRIPT" }));
            expect(scriptWrapped.querySelector("script")).toBeNull();
            expect(scriptWrapped.textContent).toBe("ab");
            await rendered.unmount();

            const iframeWrapped = await render(
                switchOf({ tag: "iframe", attributes: { srcDoc: "<script>parent." + pwn(1) + "</script>" } })
            );
            expect(iframeWrapped.querySelector("iframe")).toBeNull();
            expect(iframeWrapped.textContent).toBe("ab");
        });

        it("removes the refused attributes of the wrapper", async () => {
            const content = await render(switchOf({ tag: "div", attributes: { ONCLICK: pwn(1), class: "w" } }));

            expect(content.querySelector("div.w").getAttribute("onclick")).toBeNull();
        });
    });

    describe("actions writing the DOM", () => {
        it("setAttributeValue does not set a refused attribute", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "img",
                        attributes: { src: "x", alt: "" },
                        actions: [
                            { what: "setAttributeValue", name: "onerror", value: pwn(1), mode: "replace" },
                            { what: "setAttributeValue", name: "class", value: "loaded" },
                        ],
                    },
                ],
            });
            const img = content.querySelector("img");

            img.dispatchEvent(new Event("error"));
            expect(img.getAttribute("onerror")).toBeNull();
            expect(img.getAttribute("class")).toBe("loaded");
            expect(window.__pwn).toEqual([]);
        });

        it("toggleAttributeValue does not set a refused value", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "a",
                        content: "x",
                        actions: [
                            { what: "toggleAttributeValue", name: "href", value: "javascript:" + pwn(1) },
                            { what: "toggleAttributeValue", name: "class", value: "open" },
                        ],
                    },
                ],
            });
            const link = content.querySelector("a");

            expect(link.getAttribute("href")).toBeNull();
            expect(link.getAttribute("class")).toBe("open");
        });

        it("unsetAttributeValue does not leave a refused value", async () => {
            const content = await render({
                renderView: [
                    {
                        type: "a",
                        attributes: { href: "x javascript:" + pwn(1), class: "a b" },
                        content: "x",
                        actions: [
                            { what: "unsetAttributeValue", name: "href", value: "x" },
                            { what: "unsetAttributeValue", name: "class", value: "a" },
                        ],
                    },
                ],
            });
            const link = content.querySelector("a");

            expect(link.getAttribute("href")).toBeNull();
            expect(link.getAttribute("class")).toBe("b");
        });

        it("Redirect does not navigate to a javascript: URL", async () => {
            await render({
                renderView: [{ type: "div", content: "x", actions: [{ what: "redirect", to: "~~.next" }] }],
                data: { next: "javascript:" + pwn(1) },
            });

            expect(window.__pwn).toEqual([]);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Redirect: the navigation to"));
        });
    });
});
