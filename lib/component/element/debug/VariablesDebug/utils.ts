export type FlatRow = { path: string; value: unknown };

export const flattenObject = (value: unknown, basePath = "data"): FlatRow[] => {
    const rows: FlatRow[] = [];

    const walk = (value: unknown, path: string) => {
        if (Array.isArray(value)) {
            value.forEach((item, idx) => walk(item, `${path}.${idx}`));
            return;
        }
        if (value !== null && typeof value === "object") {
            Object.entries(value as Record<string, unknown>).forEach(([key, val]) => walk(val, `${path}.${key}`));
            return;
        }
        rows.push({ path, value });
    };

    walk(value, basePath);
    return rows;
};
