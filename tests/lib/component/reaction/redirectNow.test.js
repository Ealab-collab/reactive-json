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

    it("replaces the history entry with replace: true", () => {
        redirect({ to: ["/dashboards/", "~~.id"], replace: true });
        expect(window.location.replace).toHaveBeenCalledWith("/dashboards/12");
        expect(window.location.href).toBe("/current");
    });
});
