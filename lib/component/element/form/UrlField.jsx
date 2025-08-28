import { Input } from "./Input.jsx";

/**
 * UrlField is a convenience wrapper around Input for URL inputs.
 */
export const UrlField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "url",
            },
        }}
    />;
};
