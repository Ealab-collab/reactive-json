import { dateValueToDisplay, dateValueToStorage } from "../../../../../lib/component/element/form/dateValue.js";

describe("dateValue helpers", () => {
    describe("dateValueToDisplay", () => {
        it("extracts the date part of a datetime storage value", () => {
            expect(dateValueToDisplay("2016-11-29T23:00:00")).toBe("2016-11-29");
        });

        it("extracts date + time when withTime is true", () => {
            expect(dateValueToDisplay("2016-11-29T23:00:00", true)).toBe("2016-11-29T23:00");
        });

        it("keeps an already date-only value untouched", () => {
            expect(dateValueToDisplay("2027-03-15")).toBe("2027-03-15");
        });

        it("normalizes a space separator", () => {
            expect(dateValueToDisplay("2016-11-29 23:00:00", true)).toBe("2016-11-29T23:00");
        });

        it("returns an empty string for empty/invalid input", () => {
            expect(dateValueToDisplay("")).toBe("");
            expect(dateValueToDisplay(null)).toBe("");
            expect(dateValueToDisplay(undefined)).toBe("");
        });
    });

    describe("dateValueToStorage", () => {
        it("storageFormat 'date' returns a bare YYYY-MM-DD", () => {
            expect(dateValueToStorage("2027-03-15", false, "date")).toBe("2027-03-15");
        });

        it("storageFormat 'datetime', date-only input anchors at midnight", () => {
            expect(dateValueToStorage("2027-03-15", false, "datetime")).toBe("2027-03-15T00:00:00");
        });

        it("storageFormat 'datetime' with time appends seconds", () => {
            expect(dateValueToStorage("2027-03-15T14:30", true, "datetime")).toBe("2027-03-15T14:30:00");
        });

        it("storageFormat 'datetime', datetime-local input without time falls back to midnight", () => {
            expect(dateValueToStorage("2027-03-15", true, "datetime")).toBe("2027-03-15T00:00:00");
        });

        it("storageFormat 'date' truncates any time in the input", () => {
            expect(dateValueToStorage("2027-03-15T09:00", true, "date")).toBe("2027-03-15");
        });

        it("defaults to datetime when storageFormat is omitted", () => {
            expect(dateValueToStorage("2027-03-15")).toBe("2027-03-15T00:00:00");
        });

        it("returns an empty string for empty input (clears the field)", () => {
            expect(dateValueToStorage("")).toBe("");
            expect(dateValueToStorage(null)).toBe("");
        });
    });

    describe("round-trip", () => {
        it("date-only value is stable", () => {
            expect(dateValueToStorage(dateValueToDisplay("2016-11-29"), false, "date")).toBe("2016-11-29");
        });

        it("datetime value preserves date + time through datetime-local", () => {
            expect(dateValueToStorage(dateValueToDisplay("2016-11-29T23:00:00", true), true, "datetime"))
                .toBe("2016-11-29T23:00:00");
        });
    });
});
