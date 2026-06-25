/**
 * dataSyncGroups — coordination of DataSync instances that share one syncable.
 *
 * Opt-in "merge" / shared-syncable system: several DataSync that resolve the
 * same `mergeKey` (a stable identity extracted from the syncable, e.g. its
 * submission_url) form a group with a single WRITER, the owner. Any member's
 * edit is:
 *   1. broadcast to the other members → applied to their store, echo-suppressed
 *      (live mirror, no re-POST);
 *   2. delegated to the OWNER, which (re)schedules its one debounced POST,
 *      reading the latest shared data at fire time.
 *
 * One writer + fresh read at POST time makes rapid alternating edits on
 * different members safe: they coalesce into a single POST of the last value,
 * with no concurrent writers, no stale-data write, no revert. The owner is
 * elected on join (first member) and re-elected if it leaves.
 *
 * A member is `{ applyRemote(data), requestSync() }`.
 */

const groups = new Map(); // key -> { members: member[], owner: member|null }

/** Join the group for `key`. Returns leave() (re-elects the owner if needed). */
export const joinSyncGroup = (key, member) => {
    if (key == null || key === "") return () => {};
    let g = groups.get(key);
    if (!g) {
        g = { members: [], owner: null };
        groups.set(key, g);
    }
    g.members.push(member);
    if (!g.owner) g.owner = member;
    return () => {
        g.members = g.members.filter((m) => m !== member);
        if (g.owner === member) g.owner = g.members[0] ?? null;
        if (g.members.length === 0) groups.delete(key);
    };
};

/** The current single writer for `key`, or null. */
export const getOwner = (key) => (key == null ? null : groups.get(key)?.owner ?? null);

/** Apply `data` to every OTHER member of `key`'s group (live mirror). */
export const broadcastToGroup = (key, fromMember, data) => {
    if (key == null || key === "") return;
    const g = groups.get(key);
    if (!g) return;
    for (const m of g.members) {
        if (m !== fromMember && typeof m.applyRemote === "function") {
            m.applyRemote(data);
        }
    }
};

/** Test helper — clear all groups. */
export const __resetGroups = () => groups.clear();
