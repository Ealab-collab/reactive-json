import { Input } from "./Input.jsx";

/**
 * FileField is a convenience wrapper around Input for file inputs.
 */
export const FileField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "file",
            },
        }}
    />;
};
