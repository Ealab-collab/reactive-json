import { Input } from "./Input.jsx";

/**
 * WeekField is a convenience wrapper around Input for week inputs.
 */
export const WeekField = (componentProps) => {
    return <Input 
        {...componentProps}
        props={{
            ...componentProps.props,
            inputAttributes: {
                ...componentProps.props?.inputAttributes,
                type: "week",
            },
        }}
    />;
};
