import { Input } from "./Input.jsx";

/**
 * PasswordField is a convenience wrapper around Input for password inputs.
 */
export const PasswordField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "password",
            },
        }}
    />;
};
