/**
 * Value helpers for DateField / DateTimeField when a `storageFormat` is set.
 *
 * They bridge the raw value of an HTML `date` / `datetime-local` input and a
 * fixed-format storage string (typically a backend datetime field, e.g. Drupal:
 * "Y-m-d" for a date-only field, "Y-m-d\TH:i:s" for a datetime field).
 *
 * These are pure functions (no React) so they can be unit-tested in isolation.
 */

/**
 * Stored value → the substring an HTML date/datetime-local input can display.
 *
 * A `date` input needs "YYYY-MM-DD"; a `datetime-local` input needs
 * "YYYY-MM-DDTHH:MM". A stored value may carry more precision (seconds,
 * fraction, zone) or use a space separator — we normalize the separator and
 * keep only what the input renders, so a datetime value shows up correctly
 * instead of leaving the input blank.
 *
 * @param {string} stored The stored value.
 * @param {boolean} [withTime=false] True for datetime-local, false for date.
 * @returns {string} The value to feed the input (empty string if none).
 */
export const dateValueToDisplay = (stored, withTime = false) => {
    if (!stored || typeof stored !== "string") {
        return "";
    }

    const normalized = stored.replace(" ", "T");

    return withTime ? normalized.slice(0, 16) : normalized.slice(0, 10);
};

/**
 * Input value → the storage string, in the requested format.
 *
 *  - storageFormat "date"      → "YYYY-MM-DD".
 *  - storageFormat "datetime"  → "YYYY-MM-DDTHH:MM:SS" (seconds appended;
 *    time anchored at 00:00:00 when the input carries no time).
 *
 * An empty input yields an empty string (clears the field).
 *
 * @param {string} inputValue The raw value from the input element.
 * @param {boolean} [withTime=false] True for datetime-local, false for date.
 * @param {("date"|"datetime")} [storageFormat="datetime"] Target storage format.
 * @returns {string} The value to store (empty string if none).
 */
export const dateValueToStorage = (inputValue, withTime = false, storageFormat = "datetime") => {
    if (!inputValue) {
        return "";
    }

    const datePart = inputValue.slice(0, 10);

    if (storageFormat === "date") {
        return datePart;
    }

    if (!withTime) {
        return `${datePart}T00:00:00`;
    }

    const dateTimePart = inputValue.slice(0, 16);

    return dateTimePart.length === 16 ? `${dateTimePart}:00` : `${datePart}T00:00:00`;
};
