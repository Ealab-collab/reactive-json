import { Input } from "./Input.jsx";

/**
 * MonthField is a convenience wrapper around Input for month inputs.
 */
export const MonthField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "month",
            },
        }}
    />;
};
