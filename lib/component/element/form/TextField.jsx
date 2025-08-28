import { Input } from "./Input.jsx";

/**
 * TextField is a convenience wrapper around Input.
 */
export const TextField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "text",
            },
        }}
    />;
};
