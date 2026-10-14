/**
 * @jest-environment jsdom
 */
import axios from "axios";
import { useReactiveData } from "../../../../../lib/engine/hook/useReactiveData.js";
import { renderRjBuild } from "../form/renderRjBuild.js";

jest.mock("axios");

const syncable = (title, itemUrl = "/item/1", submissionUrl = "/save/1") => ({
    item_url: itemUrl,
    submission_url: submissionUrl,
    data: { title },
});

/**
 * Builds a RjBuild with the given DataSync paths and one button per given setData.
 */
const build = (syncPaths, buttons, data) => ({
    renderView: [
        ...syncPaths.map((path) => ({ type: "DataSync", path, mode: "immediate" })),
        ...Object.entries(buttons).map(([name, [path, value]]) => ({
            type: "button",
            attributes: { class: name },
            content: name,
            actions: [{ what: "setData", on: "click", path, value }],
        })),
    ],
    data,
});

describe("DataSync", () => {
    let rendered;
    let onDirty;
    let policyPlugins;

    beforeEach(() => {
        axios.post.mockReset();
        axios.post.mockImplementation((url, body) => Promise.resolve({ data: body, status: 200 }));
        jest.spyOn(console, "warn").mockImplementation(() => {});

        onDirty = jest.fn();
        // An editor policy: the "item" and "other" syncables are saved by a global flush signal,
        // the others are saved automatically.
        const useDataSyncPolicy = ({ path }) => {
            const flushSignal = useReactiveData("flush");

            return {
                manual: path === "item" || path === "other",
                flushSignal,
                onDirty,
                defaultMergeKey: (currentSyncable) => currentSyncable?.item_url,
            };
        };
        policyPlugins = { hook: { useDataSyncPolicy } };
    });

    afterEach(async () => {
        await rendered?.unmount();
        rendered = undefined;
        jest.restoreAllMocks();
    });

    const press = (name) => rendered.click(rendered.container.querySelector(`.${name}`));

    it("saves the edits automatically without a policy hook", async () => {
        rendered = await renderRjBuild(
            build(["~~.item"], { edit: ["~~.item.data.title", "b"] }, { item: syncable("a") })
        );

        await press("edit");

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith("/save/1", expect.objectContaining({ data: { title: "b" } }));
    });

    it("holds the edits in manual mode, and saves them once when the flush signal changes", async () => {
        rendered = await renderRjBuild(
            build(
                ["~~.item"],
                {
                    edit: ["~~.item.data.title", "b"],
                    editAgain: ["~~.item.data.title", "c"],
                    flush: ["~~.flush", 4],
                    flushAgain: ["~~.flush", 5],
                },
                { flush: 3, item: syncable("a") }
            ),
            { plugins: policyPlugins }
        );

        // No save on mount, although the flush signal already has a value.
        expect(axios.post).not.toHaveBeenCalled();

        await press("edit");
        await press("editAgain");
        expect(axios.post).not.toHaveBeenCalled();
        expect(onDirty).toHaveBeenCalledTimes(2);

        await press("flush");
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith("/save/1", expect.objectContaining({ data: { title: "c" } }));

        // Nothing held anymore: a new flush signal does not save again.
        await press("flushAgain");
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it("lets the policy decide for each syncable", async () => {
        rendered = await renderRjBuild(
            build(
                ["~~.item", "~~.form"],
                { editForm: ["~~.form.data.title", "g"] },
                { flush: 0, item: syncable("a"), form: syncable("f", "/form/1", "/save/form") }
            ),
            { plugins: policyPlugins }
        );

        await press("editForm");

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith("/save/form", expect.objectContaining({ data: { title: "g" } }));
        expect(onDirty).not.toHaveBeenCalled();
    });

    it("groups the syncables by the default merge key: live mirror, then one write by the owner", async () => {
        rendered = await renderRjBuild(
            build(
                ["~~.item", "~~.other"],
                { editOther: ["~~.other.data.title", "c"], flush: ["~~.flush", 1] },
                { flush: 0, item: syncable("a"), other: syncable("a") }
            ),
            { plugins: policyPlugins }
        );

        await press("editOther");
        expect(rendered.getData().item.data.title).toBe("c");
        expect(axios.post).not.toHaveBeenCalled();

        await press("flush");
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith("/save/1", expect.objectContaining({ data: { title: "c" } }));
    });

    it("does not group the syncables without an explicit mergeKey or a policy", async () => {
        rendered = await renderRjBuild(
            build(
                ["~~.item", "~~.other"],
                { editOther: ["~~.other.data.title", "c"] },
                { item: syncable("a"), other: syncable("a") }
            )
        );

        await press("editOther");

        expect(rendered.getData().item.data.title).toBe("a");
        expect(axios.post).toHaveBeenCalledTimes(1);
    });
});
