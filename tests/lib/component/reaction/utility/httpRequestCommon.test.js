import { executeHttpRequest } from "../../../../../lib/component/reaction/utility/httpRequestCommon.jsx";

jest.mock("axios");

import axios from "axios";

/**
 * Lightweight stub of the DOM bits httpRequestCommon touches. The test
 * env is node ; we don't pull in jsdom because the surface used here is
 * one dataset object on document.body, the CustomEvent constructor for
 * the `response` event, and a `dispatchEvent` method on the currentTarget
 * — all trivially mockable.
 */
beforeAll(() => {
    if (typeof global.document === "undefined") {
        global.document = { body: { dataset: {} } };
    }
    if (typeof global.CustomEvent === "undefined") {
        global.CustomEvent = class CustomEvent {
            constructor(type, init = {}) {
                this.type = type;
                this.detail = init.detail;
                this.bubbles = init.bubbles;
                this.cancelable = init.cancelable;
                this.composed = init.composed;
            }
        };
    }
    if (typeof global.AbortController === "undefined") {
        // Node 16+ ships AbortController on globalThis, but be defensive.
        // eslint-disable-next-line global-require
        global.AbortController = require("abort-controller").AbortController;
    }
});

const buildProps = ({ requestKey, allowConcurrent, currentTarget } = {}) => {
    const updateData = jest.fn();
    const setData = jest.fn();
    const setRawAppRjBuild = jest.fn();
    const globalDataContext = {
        headersForRjBuild: {},
        plugins: { dataProcessor: {} },
        templateData: {},
        templatePath: "data",
        setData,
        setRawAppRjBuild,
        updateData,
    };
    globalDataContext.getRootContext = () => globalDataContext;
    const templateContext = {
        templateData: {},
        templatePath: "data",
    };
    return {
        args: {
            url: "/api/test",
            ...(requestKey ? { requestKey } : {}),
            ...(allowConcurrent ? { allowConcurrent } : {}),
        },
        eventData: { currentTarget: currentTarget ?? { dataset: {}, dispatchEvent: jest.fn() } },
        globalDataContext,
        templateContext,
    };
};

/**
 * Build a deferred promise so we can resolve the mocked axios call
 * after the test has had a chance to fire the next request.
 */
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

describe("executeHttpRequest — global lock (backward compat)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete document.body.dataset.htmlBuilderIsSubmitting;
    });

    it("blocks a second concurrent call when no requestKey is provided", () => {
        const first = deferred();
        axios.mockImplementationOnce(() => first.promise);

        const props1 = buildProps();
        const props2 = buildProps();

        executeHttpRequest(props1, { method: "get" }, "fetchData");
        executeHttpRequest(props2, { method: "get" }, "fetchData");

        // Only the first call reached axios ; the second silently no-op'd
        // because the global dataset lock was held.
        expect(axios).toHaveBeenCalledTimes(1);
        expect(document.body.dataset.htmlBuilderIsSubmitting).toBe("true");
    });

    it("allows a concurrent call when allowConcurrent is true", () => {
        const first = deferred();
        const second = deferred();
        axios.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);

        executeHttpRequest(buildProps({ allowConcurrent: true }), { method: "get" }, "fetchData");
        executeHttpRequest(buildProps({ allowConcurrent: true }), { method: "get" }, "fetchData");

        expect(axios).toHaveBeenCalledTimes(2);
        // Lock should NOT have been set — neither call touched it.
        expect(document.body.dataset.htmlBuilderIsSubmitting).toBeUndefined();
    });
});

describe("executeHttpRequest — requestKey cancel-on-new", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete document.body.dataset.htmlBuilderIsSubmitting;
    });

    it("aborts the previous request when a new one with the same key arrives", () => {
        const calls = [];
        axios.mockImplementation((config) => {
            calls.push(config);
            return new Promise(() => { /* never resolves in this test */ });
        });

        executeHttpRequest(buildProps({ requestKey: "facet" }), { method: "get" }, "fetchData");
        executeHttpRequest(buildProps({ requestKey: "facet" }), { method: "get" }, "fetchData");

        expect(calls).toHaveLength(2);
        // The first call's signal must have been aborted by the second.
        expect(calls[0].signal).toBeDefined();
        expect(calls[0].signal.aborted).toBe(true);
        // The second call's signal must NOT be aborted.
        expect(calls[1].signal).toBeDefined();
        expect(calls[1].signal.aborted).toBe(false);
    });

    it("bypasses the global lock when a requestKey is provided", () => {
        axios.mockImplementation(() => new Promise(() => { /* pending */ }));

        executeHttpRequest(buildProps({ requestKey: "facet" }), { method: "get" }, "fetchData");

        // Lock should NOT be set — requestKey implies allowConcurrent.
        expect(document.body.dataset.htmlBuilderIsSubmitting).toBeUndefined();
    });

    it("keeps requests under different keys independent", () => {
        const calls = [];
        axios.mockImplementation((config) => {
            calls.push(config);
            return new Promise(() => { /* pending */ });
        });

        executeHttpRequest(buildProps({ requestKey: "facetA" }), { method: "get" }, "fetchData");
        executeHttpRequest(buildProps({ requestKey: "facetB" }), { method: "get" }, "fetchData");

        expect(calls).toHaveLength(2);
        // Neither was aborted — different keys are independent.
        expect(calls[0].signal.aborted).toBe(false);
        expect(calls[1].signal.aborted).toBe(false);
    });

    it("does not dispatch a `response` event on the aborted request's currentTarget", async () => {
        // axios rejects the first call with a CanceledError once aborted ;
        // the second resolves normally.
        const first = deferred();
        const second = deferred();
        const calls = [];
        axios.mockImplementation((config) => {
            calls.push(config);
            config.signal?.addEventListener?.("abort", () => {
                const err = new Error("aborted");
                err.name = "CanceledError";
                err.code = "ERR_CANCELED";
                first.reject(err);
            });
            return calls.length === 1 ? first.promise : second.promise;
        });

        const target1 = { dataset: {}, dispatchEvent: jest.fn() };
        const target2 = { dataset: {}, dispatchEvent: jest.fn() };

        executeHttpRequest(buildProps({ requestKey: "facet", currentTarget: target1 }), { method: "get" }, "fetchData");
        executeHttpRequest(buildProps({ requestKey: "facet", currentTarget: target2 }), { method: "get" }, "fetchData");

        // Resolve the second call so its .finally runs.
        second.resolve({ data: { hello: "world" }, status: 200, headers: {} });

        // Flush microtasks for both promise chains.
        await first.promise.catch(() => {});
        await second.promise;
        // Two extra flushes for the .finally chains.
        await Promise.resolve();
        await Promise.resolve();

        // The aborted request's currentTarget never sees a response event.
        expect(target1.dispatchEvent).not.toHaveBeenCalled();
        // The successor request fires its response normally.
        expect(target2.dispatchEvent).toHaveBeenCalledTimes(1);
        const dispatchedEvent = target2.dispatchEvent.mock.calls[0][0];
        expect(dispatchedEvent.type).toBe("response");
    });

    it("releases the registry slot after the request resolves", async () => {
        // First request resolves normally ; immediately after, a new request
        // with the same key fires and registers itself. The first call's
        // resolution must NOT erase the second's registry entry.
        const first = deferred();
        const calls = [];
        axios.mockImplementation((config) => {
            calls.push(config);
            return calls.length === 1 ? first.promise : new Promise(() => { /* pending */ });
        });

        executeHttpRequest(buildProps({ requestKey: "facet" }), { method: "get" }, "fetchData");
        first.resolve({ data: {}, status: 200, headers: {} });
        await first.promise;
        await Promise.resolve();
        await Promise.resolve();

        // Now fire a second request — it should NOT see a stale entry.
        executeHttpRequest(buildProps({ requestKey: "facet" }), { method: "get" }, "fetchData");
        expect(calls).toHaveLength(2);
        // No previous controller to abort means the second call's signal
        // is fresh and unaborted.
        expect(calls[1].signal.aborted).toBe(false);
    });
});
