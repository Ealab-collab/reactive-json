import { Input } from "./Input.jsx";

/**
 * RangeField is a convenience wrapper around Input for range inputs.
 */
export const RangeField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "range",
            },
        }}
    />;
};
