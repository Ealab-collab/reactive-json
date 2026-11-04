import { ActionDependant } from "../../../engine/Actions.jsx";
import { useEvaluatedAttributes } from "../../../engine/TemplateSystem.jsx";
import { sanitizeComponentProps } from "../../../engine/utility/markupSecurity.js";
import { View } from "../../../engine/View.jsx";

/**
 * Wraps around a React component to make it work with Reactive JSON.
 *
 * Adds the attributes evaluation and actions execution.
 * The "content" property is used to render a sub-element, if the component supports it.
 *
 * The attributes are given to the component as props. When the component interprets some of them
 * in its own way (e.g. "as", which picks the rendered element), declare them in componentPolicy:
 * see sanitizeComponentProps.
 *
 * @example
 * const Card = (props) => (
 *     <ReactiveJsonBasicComponentWrapper
 *         {...props}
 *         reactComponent={MyCard}
 *         componentPolicy={{ elementTypeProps: { as: "div" } }}
 *     />
 * );
 */
export function ReactiveJsonBasicComponentWrapper({ props, currentData, path, reactComponent, componentPolicy }) {
    const attributes = sanitizeComponentProps(useEvaluatedAttributes(props.attributes), componentPolicy);

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
