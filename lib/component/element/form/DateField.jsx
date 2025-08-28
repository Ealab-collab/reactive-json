import { Input } from "./Input.jsx";

/**
 * DateField is a convenience wrapper around Input for date inputs.
 */
export const DateField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "date",
            },
        }}
    />;
};
