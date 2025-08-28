import { Input } from "./Input.jsx";

/**
 * ColorField is a convenience wrapper around Input for color inputs.
 */
export const ColorField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "color",
            },
        }}
    />;
};
