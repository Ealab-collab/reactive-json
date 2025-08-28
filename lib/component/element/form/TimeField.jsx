import { Input } from "./Input.jsx";

/**
 * TimeField is a convenience wrapper around Input for time inputs.
 */
export const TimeField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "time",
            },
        }}
    />;
};
