import { Input } from "./Input.jsx";

/**
 * TelField is a convenience wrapper around Input for telephone inputs.
 */
export const TelField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "tel",
            },
        }}
    />;
};
