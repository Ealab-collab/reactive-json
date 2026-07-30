import { Input } from "./Input.jsx";
import { dateValueToDisplay, dateValueToStorage } from "./dateValue.js";

/**
 * DateField is a convenience wrapper around Input for date inputs.
 *
 * Optional `storageFormat` ("date" | "datetime") binds the field to a
 * fixed-format storage string instead of the raw input value:
 *   - it displays only the date part of the stored value (so a datetime value
 *     shows up instead of leaving the input blank), and
 *   - it writes back "YYYY-MM-DD" (storageFormat "date") or
 *     "YYYY-MM-DDT00:00:00" (storageFormat "datetime", time anchored at
 *     midnight) — e.g. to satisfy a backend datetime field.
 *
 * Without `storageFormat` the field keeps its original behavior (the raw value
 * of the HTML `date` input is stored as-is).
 */
export const DateField = (componentProps) => {
    const storageFormat = componentProps.props?.storageFormat;
    const valueConversion = storageFormat
        ? {
            valueToDisplay: (stored) => dateValueToDisplay(stored, false),
            valueToStore: (value) => dateValueToStorage(value, false, storageFormat),
        }
        : {};

    return <Input
        {...componentProps}
        {...valueConversion}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "date",
            },
        }}
    />;
};
