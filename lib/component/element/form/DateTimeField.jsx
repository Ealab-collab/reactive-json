import { Input } from "./Input.jsx";
import { dateValueToDisplay, dateValueToStorage } from "./dateValue.js";

/**
 * DateTimeField is a convenience wrapper around Input for datetime-local inputs.
 *
 * Optional `storageFormat` ("date" | "datetime") binds the field to a
 * fixed-format storage string instead of the raw input value:
 *   - it displays the date + time part of the stored value, and
 *   - it writes back "YYYY-MM-DDTHH:MM:SS" (storageFormat "datetime",
 *     seconds appended — the HTML datetime-local value omits them) or
 *     "YYYY-MM-DD" (storageFormat "date") — e.g. to satisfy a backend
 *     datetime field whose validation requires a fixed format.
 *
 * Without `storageFormat` the field keeps its original behavior (the raw value
 * of the HTML `datetime-local` input is stored as-is).
 */
export const DateTimeField = (componentProps) => {
    const storageFormat = componentProps.props?.storageFormat;
    const valueConversion = storageFormat
        ? {
            valueToDisplay: (stored) => dateValueToDisplay(stored, true),
            valueToStore: (value) => dateValueToStorage(value, true, storageFormat),
        }
        : {};

    return <Input
        {...componentProps}
        {...valueConversion}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "datetime-local",
            },
        }}
    />;
};
