import { useContext } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../../engine/TemplateSystem.jsx";

/**
 * Joins an array of values into a single string with a configurable separator.
 *
 * Props:
 *   content   — array to join (supports template refs such as ~~.myArray)
 *   separator — string separator, default ", "
 *
 * YAML usage:
 *   - type: Join
 *     content: ~~.myArray
 *     separator: " | "
 */
export const Join = ({ props }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const items = evaluateTemplateValue({
        valueToEvaluate: props.content,
        globalDataContext,
        templateContext,
    });

    const separator = props.separator ?? ", ";

    if (!Array.isArray(items)) {
        return (
            <ActionDependant {...props}>
                {items != null ? String(items) : null}
            </ActionDependant>
        );
    }

    return (
        <ActionDependant {...props}>
            {items.join(separator)}
        </ActionDependant>
    );
};
