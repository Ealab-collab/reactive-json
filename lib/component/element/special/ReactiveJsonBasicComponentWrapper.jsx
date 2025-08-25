import { ActionDependant, useEvaluatedAttributes, View } from "../../../engine";

/**
 * Wraps around a React component to make it work with Reactive JSON.
 *
 * Adds the attributes evaluation and actions execution.
 * The "content" property is used to render a sub-element, if the component supports it.
 */
export function ReactiveJsonBasicComponentWrapper({ props, currentData, path, reactComponent }) {
    const attributes = useEvaluatedAttributes(props.attributes);

    if (!reactComponent) {
        return null;
    }

    const Element = reactComponent;

    return (
        <ActionDependant {...props}>
            <Element {...attributes}>
                {props.content && (
                    <View
                        currentData={currentData.content ?? undefined}
                        datafield={"content"}
                        path={path + ".content"}
                        props={props.content}
                    />
                )}
            </Element>
        </ActionDependant>
    );
}
