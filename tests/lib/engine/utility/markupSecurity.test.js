/**
 * @jest-environment jsdom
 */
import {
    escapeStyleText,
    isAllowedAttribute,
    isAllowedTag,
    isRawTextTag,
    isSafeNavigationUrl,
    isUnsafeUrl,
    sanitizeAttributes,
    sanitizeComponentProps,
    setAttributeSafely,
} from "../../../../lib/engine/utility/markupSecurity.js";

describe("markupSecurity", () => {
    beforeEach(() => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("isUnsafeUrl", () => {
        it.each([
            "javascript:alert(1)",
            "JavaScript:alert(1)",
            "  javascript:alert(1)",
            "\u0001javascript:alert(1)",
            "java\tscript:alert(1)",
            "java\nscr\ript:alert(1)",
            "vbscript:msgbox(1)",
            "data:text/html,<script>alert(1)</script>",
            "data: TEXT/HTML;base64,PHNjcmlwdD4=",
            "data:application/xhtml+xml,<x/>",
        ])("refuses %j", (url) => {
            expect(isUnsafeUrl(url)).toBe(true);
        });

        it.each([
            "/relative/path",
            "relative",
            "#anchor",
            "?q=javascript:",
            "https://example.com/javascript:alert(1)",
            "mailto:someone@example.com",
            "tel:+33102030405",
            "data:image/png;base64,iVBORw0KGgo=",
            "data:image/svg+xml;utf8,<svg/>",
            "javascript%3Aalert(1)",
            "",
        ])("accepts %j", (url) => {
            expect(isUnsafeUrl(url)).toBe(false);
        });

        it("ignores the values that are not strings", () => {
            expect(isUnsafeUrl(undefined)).toBe(false);
            expect(isUnsafeUrl(12)).toBe(false);
        });
    });

    describe("isSafeNavigationUrl", () => {
        it.each([
            "/crm/companies/12",
            "#activity-3",
            "?page=2",
            "page",
            "//example.com/x",
            "https://example.com",
            "HTTP://example.com",
        ])("allows %j", (url) => {
            expect(isSafeNavigationUrl(url)).toBe(true);
        });

        it.each([
            "javascript:alert(1)",
            " java\tscript:alert(1)",
            "vbscript:x",
            "data:text/html,x",
            "data:image/png;base64,x",
            "mailto:a@example.com",
            "blob:https://example.com/1",
        ])("refuses %j", (url) => {
            expect(isSafeNavigationUrl(url)).toBe(false);
        });
    });

    describe("tags", () => {
        it.each([
            "script",
            "SCRIPT",
            "Script",
            "object",
            "embed",
            "applet",
            "base",
            "frame",
            "frameset",
            "noscript",
            "xmp",
            "plaintext",
            "noembed",
            "noframes",
        ])("refuses <%s>", (tag) => {
            expect(isAllowedTag(tag)).toBe(false);
        });

        it.each(["div", "a", "form", "iframe", "style", "svg", "link", "meta", "x-card", "template"])(
            "allows <%s>",
            (tag) => {
                expect(isAllowedTag(tag)).toBe(true);
            }
        );

        it("tells the raw text elements", () => {
            expect(isRawTextTag("style")).toBe(true);
            expect(isRawTextTag("IFRAME")).toBe(true);
            expect(isRawTextTag("div")).toBe(false);
        });
    });

    describe("isAllowedAttribute", () => {
        it("refuses the event handlers that are not functions, in any case", () => {
            expect(isAllowedAttribute("onclick", "alert(1)")).toBe(false);
            expect(isAllowedAttribute("ONCLICK", "alert(1)")).toBe(false);
            expect(isAllowedAttribute("onSecurityPolicyViolation", "alert(1)")).toBe(false);
            expect(isAllowedAttribute("onClick", ["alert(1)"])).toBe(false);
            expect(isAllowedAttribute("onClick", { toString: "x" })).toBe(false);
        });

        it("keeps the event handlers that are functions, and the boolean or number props", () => {
            expect(isAllowedAttribute("onClick", () => {})).toBe(true);
            expect(isAllowedAttribute("onlyIcon", true)).toBe(true);
            expect(isAllowedAttribute("onlyCount", 2)).toBe(true);
            expect(isAllowedAttribute("onClick", undefined)).toBe(true);
        });

        it("refuses srcdoc and dangerouslySetInnerHTML, in any case", () => {
            expect(isAllowedAttribute("srcDoc", "<p>x</p>")).toBe(false);
            expect(isAllowedAttribute("SRCDOC", "<p>x</p>")).toBe(false);
            expect(isAllowedAttribute("dangerouslySetInnerHTML", { __html: "<p>x</p>" })).toBe(false);
        });

        it("refuses the URL attributes holding an unsafe URL, in any case and spelling", () => {
            for (const name of [
                "href",
                "HREF",
                "src",
                "SRC",
                "action",
                "formAction",
                "FORMACTION",
                "xlinkHref",
                "xlink:href",
                "data",
                "poster",
            ]) {
                expect(isAllowedAttribute(name, "javascript:alert(1)")).toBe(false);
                expect(isAllowedAttribute(name, "https://example.com")).toBe(true);
            }
        });

        it("refuses an unsafe URL given as an array", () => {
            expect(isAllowedAttribute("HREF", ["javascript:alert(1)"])).toBe(false);
        });

        it("keeps the other attributes", () => {
            expect(isAllowedAttribute("className", "javascript:")).toBe(true);
            expect(isAllowedAttribute("title", "javascript:alert(1)")).toBe(true);
            expect(isAllowedAttribute("data-href", "javascript:alert(1)")).toBe(true);
            expect(isAllowedAttribute("style", { color: "red" })).toBe(true);
        });

        it("refuses the animations of a link target or an event handler", () => {
            expect(isAllowedAttribute("attributeName", "href", "animate")).toBe(false);
            expect(isAllowedAttribute("attributeName", "xlink:href", "set")).toBe(false);
            expect(isAllowedAttribute("attributename", "onbegin", "set")).toBe(false);
            expect(isAllowedAttribute("attributeName", "opacity", "animate")).toBe(true);
            expect(isAllowedAttribute("attributeName", "href", "div")).toBe(true);
        });

        it("refuses the http-equiv of a meta", () => {
            expect(isAllowedAttribute("httpEquiv", "refresh", "meta")).toBe(false);
            expect(isAllowedAttribute("http-equiv", "refresh", "META")).toBe(false);
            expect(isAllowedAttribute("itemProp", "name", "meta")).toBe(true);
        });

        it("does not interpret the props of the components", () => {
            // "as" picks the element of some components only: see sanitizeComponentProps.
            expect(isAllowedAttribute("as", "script")).toBe(true);
            // On a link, "as" is the type of a preloaded resource.
            expect(isAllowedAttribute("as", "script", "link")).toBe(true);
        });
    });

    describe("sanitizeAttributes", () => {
        it("returns the same object when nothing is removed", () => {
            const attributes = { className: "a", href: "/x", onClick: () => {} };
            expect(sanitizeAttributes(attributes, "a")).toBe(attributes);
        });

        it("returns a copy without the refused attributes", () => {
            const attributes = { className: "a", HREF: "javascript:alert(1)", ONCLICK: "alert(1)", srcDoc: "x" };
            const sanitized = sanitizeAttributes(attributes, "a");

            expect(sanitized).toEqual({ className: "a" });
            expect(attributes.HREF).toBe("javascript:alert(1)");
        });

        it("warns once per refused attribute name", () => {
            sanitizeAttributes({ onmouseover: "x" });
            sanitizeAttributes({ onmouseover: "y" });

            const warnings = console.warn.mock.calls.filter(([message]) => String(message).includes('"onmouseover"'));
            expect(warnings).toHaveLength(1);
        });

        it("accepts a missing attributes object", () => {
            expect(sanitizeAttributes(undefined)).toBe(undefined);
        });
    });

    describe("sanitizeComponentProps", () => {
        const withAs = { elementTypeProps: { as: "div" } };

        it("does not guess the props of a component without a policy", () => {
            expect(sanitizeComponentProps({ as: "SCRIPT", className: "a" })).toEqual({ as: "SCRIPT", className: "a" });
        });

        it.each(["script", "SCRIPT", "Script", "object", "base", "style", "IFRAME"])(
            "removes the element type %j",
            (tag) => {
                expect(sanitizeComponentProps({ as: tag, className: "a" }, withAs)).toEqual({ className: "a" });
                expect(
                    sanitizeComponentProps({ dialogAs: tag }, { elementTypeProps: { dialogAs: undefined } })
                ).toEqual({});
            }
        );

        it("keeps the other element types, and returns the same object when nothing is removed", () => {
            const Component = () => null;

            for (const props of [{ as: "section" }, { as: "BUTTON" }, { as: Component }, { className: "a" }]) {
                expect(sanitizeComponentProps(props, withAs)).toBe(props);
            }
        });

        it("applies the rules of the rendered element", () => {
            const refresh = { httpEquiv: "refresh", content: "0;url=https://example.com" };

            expect(sanitizeComponentProps({ as: "meta", ...refresh }, withAs)).toEqual({
                as: "meta",
                content: "0;url=https://example.com",
            });
            // Without "as", the component renders its default element.
            expect(sanitizeComponentProps(refresh, { elementTypeProps: { as: "meta" } })).toEqual({
                content: "0;url=https://example.com",
            });
            expect(sanitizeComponentProps({ as: "set", attributeName: "href" }, withAs)).toEqual({ as: "set" });
            expect(sanitizeComponentProps({ as: "div", attributeName: "href" }, withAs)).toEqual({
                as: "div",
                attributeName: "href",
            });
        });

        it("applies the rules of the HTML attributes", () => {
            expect(
                sanitizeComponentProps(
                    { as: "a", HREF: "javascript:alert(1)", ONCLICK: "alert(1)", title: "t" },
                    withAs
                )
            ).toEqual({ as: "a", title: "t" });
        });

        it("checks the attributes of an inner element", () => {
            const props = {
                title: "Tab",
                tabAttrs: { as: "SCRIPT", type: "text/javascript", ONCLICK: "alert(1)", className: "tab" },
            };
            const sanitized = sanitizeComponentProps(props, {
                attributeProps: { tabAttrs: { elementTypeProps: { as: "button" } } },
            });

            expect(sanitized).toEqual({ title: "Tab", tabAttrs: { type: "text/javascript", className: "tab" } });
            expect(props.tabAttrs.as).toBe("SCRIPT");
        });

        it("accepts missing props", () => {
            expect(sanitizeComponentProps(undefined, withAs)).toBe(undefined);
            expect(sanitizeComponentProps({ tabAttrs: "x" }, { attributeProps: { tabAttrs: {} } })).toEqual({
                tabAttrs: "x",
            });
        });
    });

    describe("escapeStyleText", () => {
        it("prevents the style sheet from closing its element", () => {
            expect(escapeStyleText("a{}</style><img src=x onerror=alert(1)>")).toBe(
                "a{}<\\/style><img src=x onerror=alert(1)>"
            );
            expect(escapeStyleText("a{}</STYLE >")).toBe("a{}<\\/STYLE >");
        });

        it("leaves a normal style sheet unchanged", () => {
            const css = '.a > .b { content: "<"; color: red } @media (min-width: 10px) { .c { top: 0 } }';
            expect(escapeStyleText(css)).toBe(css);
        });
    });

    describe("setAttributeSafely", () => {
        it("sets the allowed attributes", () => {
            const element = document.createElement("a");

            expect(setAttributeSafely(element, "aria-label", "Open")).toBe(true);
            expect(element.getAttribute("aria-label")).toBe("Open");
        });

        it("does not set the refused attributes", () => {
            const element = document.createElement("img");

            expect(setAttributeSafely(element, "onerror", "alert(1)")).toBe(false);
            expect(setAttributeSafely(element, "SRC", "javascript:alert(1)")).toBe(false);
            expect(element.attributes).toHaveLength(0);
        });
    });
});
