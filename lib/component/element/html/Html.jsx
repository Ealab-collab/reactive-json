import { useContext, useRef } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { normalizeAttributesForReactJsx } from "../../../engine/utility/reactJsxHelpers.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { evaluateAttributes } from "../../../engine/TemplateSystem.jsx";
import { View } from "../../../engine/View.jsx";

export const Html = ({ props, currentData, datafield, path }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const mainAttributesHolderRef = useRef(null);

    const Tag = `${props.tag}`;
    const extra = props.extra ?? {};

    // We need to alter the incoming attributes.
    // Normalize the attributes for JSX.
    const attrs = normalizeAttributesForReactJsx(props.attributes);
    const attrsFromCurrentData = normalizeAttributesForReactJsx(currentData.attributes);

    // Infer the props (template) attributes with the data attributes.
    for (const attrName of Object.keys(attrsFromCurrentData)) {
        if (attrName.charAt(0) === "+") {
            // Append to the props attribute value.
            const finalAttributeName = attrName.substring(1);
            attrs[finalAttributeName] =
                (attrs[finalAttributeName] ?? "").length > 0
                    ? // Append using a space.
                      " " + attrsFromCurrentData[attrName]
                    : // Set directly.
                      attrsFromCurrentData[attrName];
            continue;
        }

        // Set the props attribute value directly.
        attrs[attrName] = attrsFromCurrentData[attrName];
    }

    const evaluatedAttrs = evaluateAttributes({ attrs, globalDataContext, templateContext });

    const isVoidTag = (tag) => {
        const voidTagList = [
            "area",
            "base",
            "br",
            "col",
            "embed",
            "hr",
            "img",
            "input",
            "link",
            "meta",
            "param",
            "source",
            "track",
            "wbr",
        ];
        return tag && voidTagList.indexOf(tag) !== -1;
    };

    return (
        <ActionDependant {...props} attributesHolderRef={mainAttributesHolderRef}>
            {isVoidTag(props.tag) ? (
                <>
                    <Tag ref={mainAttributesHolderRef} {...evaluatedAttrs} />
                    {Object.keys(extra).length ? <View props={extra} /> : ""}
                </>
            ) : (
                <>
                    <Tag ref={mainAttributesHolderRef} {...evaluatedAttrs}>
                        {props.content && (
                            <View
                                currentData={currentData.content ?? undefined}
                                datafield={"content"}
                                path={path + ".content"}
                                props={props.content}
                            />
                        )}
                    </Tag>
                    {Object.keys(extra).length ? <View props={extra} /> : ""}
                </>
            )}
        </ActionDependant>
    );
};
