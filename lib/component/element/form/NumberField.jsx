import { Input } from "./Input.jsx";

/**
 * NumberField is a convenience wrapper around Input for number inputs.
 */
export const NumberField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "number",
            },
        }}
    />;
};
