import { useEffect, useContext } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

export const UnsetAttribute = (props) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const { attributesHolderRef } = props;

    const { name } = props.actionProps || {};

    useEffect(() => {
        if (!attributesHolderRef?.current || !name) {
            return;
        }

        const evaluatedName = String(
            evaluateTemplateValue({
                valueToEvaluate: name,
                globalDataContext,
                templateContext,
            })
        );

        const element = attributesHolderRef.current;

        element.removeAttribute(evaluatedName);
    }, [name, globalDataContext.data, templateContext, attributesHolderRef]);

    return props.children;
};
