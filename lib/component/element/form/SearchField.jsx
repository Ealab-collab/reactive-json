import { Input } from "./Input.jsx";

/**
 * SearchField is a convenience wrapper around Input for search inputs.
 */
export const SearchField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "search",
            },
        }}
    />;
};
