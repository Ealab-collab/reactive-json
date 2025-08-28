import { Input } from "./Input.jsx";

/**
 * DateTimeField is a convenience wrapper around Input for datetime-local inputs.
 */
export const DateTimeField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "datetime-local",
            },
        }}
    />;
};
