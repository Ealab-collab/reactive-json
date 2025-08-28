import { Input } from "./Input.jsx";

/**
 * EmailField is a convenience wrapper around Input for email inputs.
 */
export const EmailField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "email",
            },
        }}
    />;
};
