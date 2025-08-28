import { Input } from "./Input.jsx";

/**
 * HiddenField is a convenience wrapper around Input for hidden inputs.
 */
export const HiddenField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "hidden",
            },
        }}
    />;
};
