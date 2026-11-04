import { redirectNow } from "../../../../lib/component/reaction/redirectNow.jsx";

describe("redirectNow", () => {
    const originalWindow = global.window;
    const globalDataContext = { templatePath: "data", templateData: { id: 12 } };
    const templateContext = { templatePath: "data.rows.0", templateData: { slug: "hello" } };

    beforeEach(() => {
        global.window = { location: { href: "/current", replace: jest.fn() } };
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        global.window = originalWindow;
        jest.restoreAllMocks();
    });

    const redirect = (args) => redirectNow({ args, globalDataContext, templateContext });

    it("navigates to a string URL or reference", () => {
        redirect({ to: "/plain" });
        expect(window.location.href).toBe("/plain");
    });

    it("navigates to a URL built from segments", () => {
        redirect({ to: ["/dashboards/", "~~.id", "/", "~.slug", { param: "edit", value: "1" }] });
        expect(window.location.href).toBe("/dashboards/12/hello?edit=1");
    });

    it("does not navigate when a required segment is empty", () => {
        redirect({ to: ["/dashboards/", { segment: "~~.missing", required: true }] });
        expect(window.location.href).toBe("/current");
    });

    it("does not navigate when the URL is empty", () => {
        redirect({ to: "~~.missing" });
        expect(window.location.href).toBe("/current");
    });

    it.each([
        "javascript:alert(1)",
        " JavaScript:alert(1)",
        "java\tscript:alert(1)",
        "vbscript:msgbox(1)",
        "data:text/html,<script>alert(1)</script>",
        "mailto:someone@example.com",
    ])("does not navigate to %j", (url) => {
        redirect({ to: url });
        redirect({ to: url, replace: true });
        expect(window.location.href).toBe("/current");
        expect(window.location.replace).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("redirectNow: the navigation to"));
    });

    it("does not navigate to a javascript: URL coming from the data or built from segments", () => {
        const dataContext = { templatePath: "data", templateData: { next: "javascript:alert(1)" } };

        redirectNow({ args: { to: "~~.next" }, globalDataContext: dataContext, templateContext });
        redirectNow({ args: { to: ["~~.next"] }, globalDataContext: dataContext, templateContext });
        expect(window.location.href).toBe("/current");
    });

    it("navigates to the http(s) and relative URLs", () => {
        for (const url of ["https://example.com/a", "#section", "?page=2", "//example.com/b"]) {
            redirect({ to: url });
            expect(window.location.href).toBe(url);
        }
    });

    it("replaces the history entry with replace: true", () => {
        redirect({ to: ["/dashboards/", "~~.id"], replace: true });
        expect(window.location.replace).toHaveBeenCalledWith("/dashboards/12");
        expect(window.location.href).toBe("/current");
    });
});
