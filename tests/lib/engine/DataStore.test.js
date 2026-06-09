import { DataStore } from "/home/kwanito/cursor-docs/reactive-json/lib/engine/DataStore.js";

/**
 * These tests pin down DataStore.notify() — the pub/sub layer behind
 * useReactiveData (useSyncExternalStore). React guarantees a getSnapshot
 * re-read whenever a subscribe() callback fires, so "callback fired" here is
 * equivalent to "the bound view re-renders". Testing at the store level keeps
 * these fast and avoids a jsdom/RTL dependency.
 */

describe("DataStore.notify — root replacement: store.set('', newData)", () => {
    // Real trigger: a `setData` reaction, or an HTTP reaction whose
    // updateDataAtLocation resolves to "data" (httpRequestCommon), both replace
    // the whole root via set(""). There is NO accompanying re-render on those
    // paths, so the notification is the only thing that refreshes the views.
    test("notifies listeners bound to sub-paths, not just the root listener", () => {
        const store = new DataStore({ analysisJobs: ["old"], toy: { id: 1 } });
        const calls = { root: 0, list: 0, toy: 0, deep: 0 };
        store.subscribe("", () => calls.root++);
        store.subscribe("analysisJobs", () => calls.list++);
        store.subscribe("toy", () => calls.toy++);
        store.subscribe("toy.id", () => calls.deep++);

        store.set("", { analysisJobs: ["newer"], toy: { id: 2 } });

        // Regression guard: pre-fix, every sub-path stayed at 0 because the
        // descendant check collapsed to path.startsWith(".").
        expect(calls).toEqual({ root: 1, list: 1, toy: 1, deep: 1 });
    });

    test("fires each listener exactly once (no double-notify across steps)", () => {
        const store = new DataStore({ a: 1, b: { c: 2 } });
        const calls = { root: 0, a: 0, b: 0, bc: 0 };
        store.subscribe("", () => calls.root++);
        store.subscribe("a", () => calls.a++);
        store.subscribe("b", () => calls.b++);
        store.subscribe("b.c", () => calls.bc++);

        store.set("", { a: 9, b: { c: 8 } });

        expect(calls).toEqual({ root: 1, a: 1, b: 1, bc: 1 });
    });

    test("still notifies a listener whose path no longer exists after replace", () => {
        // The view must re-read so it can react to its value becoming undefined.
        const store = new DataStore({ gone: { value: 1 } });
        let goneCalls = 0;
        store.subscribe("gone.value", () => goneCalls++);

        store.set("", { somethingElse: true });

        expect(goneCalls).toBe(1);
        expect(store.get("gone.value")).toBeUndefined();
    });
});

describe("DataStore.notify — sub-path change: store.set('user', ...)", () => {
    test("notifies the path, its descendants, its ancestors, and root", () => {
        const store = new DataStore({ user: { name: "a", email: "b" } });
        const calls = { root: 0, user: 0, name: 0, email: 0 };
        store.subscribe("", () => calls.root++);
        store.subscribe("user", () => calls.user++);
        store.subscribe("user.name", () => calls.name++);
        store.subscribe("user.email", () => calls.email++);

        store.set("user", { name: "c", email: "d" });

        expect(calls).toEqual({ root: 1, user: 1, name: 1, email: 1 });
    });

    test("does NOT notify unrelated sibling paths (no over-notification)", () => {
        // Guards against the root-replacement branch leaking into sub-path changes.
        const store = new DataStore({ user: { name: "a" }, account: { id: 1 } });
        const calls = { user: 0, sibling: 0, siblingChild: 0 };
        store.subscribe("user", () => calls.user++);
        store.subscribe("account", () => calls.sibling++);
        store.subscribe("account.id", () => calls.siblingChild++);

        store.set("user.name", "z");

        expect(calls.user).toBe(1); // ancestor of the changed path
        expect(calls.sibling).toBe(0);
        expect(calls.siblingChild).toBe(0);
    });

    test("a deep change notifies every ancestor up to root, once each", () => {
        const store = new DataStore({ a: { b: { c: 1 } } });
        const calls = { root: 0, a: 0, ab: 0, abc: 0 };
        store.subscribe("", () => calls.root++);
        store.subscribe("a", () => calls.a++);
        store.subscribe("a.b", () => calls.ab++);
        store.subscribe("a.b.c", () => calls.abc++);

        store.set("a.b.c", 2);

        expect(calls).toEqual({ root: 1, a: 1, ab: 1, abc: 1 });
    });
});
