import {evaluateAttributes} from "../../../engine/TemplateSystem";
import View from "../../../engine/View";
import ActionDependant from "../../../engine/Actions";
import {useContext} from "react";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";

export const normalizeAttributesForReactJsx = (maybeAttributesObj) => {
    if (typeof maybeAttributesObj !== "object" || Object.keys(maybeAttributesObj).length === 0) {
        // Not a valid attributes object.
        return {};
    }

    const mapping = {
        "class": "className",
        // TODO: checked to defaultChecked seems incorrect. Commented out for removal.
        // "checked": "defaultChecked",
    };

    // Recreate a shallow copy with the normalized attribute keys.
    const attributesObj = {};

    for (const [attributeName, attributeValue] of Object.entries(maybeAttributesObj)) {
        const finalAttributeName = mapping.hasOwnProperty(attributeName)
            ? mapping[attributeName]
            : attributeName;
        attributesObj[finalAttributeName] = attributeValue;
    }

    return attributesObj;
};

const Html = ({props, currentData, datafield, path}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const Tag = `${props.tag}`;
    const extra = props.extra ?? {};

    // We need to alter the incoming attributes.
    // Normalize the attributes for JSX.
    const attrs = normalizeAttributesForReactJsx(props.attributes);
    const attrsFromCurrentData = normalizeAttributesForReactJsx(currentData.attributes);

    // Infer the props (template) attributes with the data attributes.
    for (const attrName of Object.keys(attrsFromCurrentData)) {
        if (attrName.charAt(0) === '+') {
            // Append to the props attribute value.
            const finalAttributeName = attrName.substring(1);
            attrs[finalAttributeName] = (attrs[finalAttributeName] ?? "").length > 0
                // Append using a space.
                ? " " + attrsFromCurrentData[attrName]
                // Set directly.
                : attrsFromCurrentData[attrName];
            continue;
        }

        // Set the props attribute value directly.
        attrs[attrName] = attrsFromCurrentData[attrName];
    }

    const evaluatedAttrs = evaluateAttributes({attrs, globalDataContext, templateContext});

    // console.log({
    //     "cpn": "Html",
    //     "props": props,
    //     "currentData": currentData,
    //     "datafield": datafield,
    //     "path": path,
    //     "finalAttrs": attrs,
    // });

    const isVoidTag = (tag) => {
        const voidTagList = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
        return tag && (voidTagList.indexOf(tag) !== -1);
    };

    return <ActionDependant {...props}>
        {isVoidTag(props.tag)
            ? <>
                <Tag {...evaluatedAttrs}/>
                {Object.keys(extra).length ? (
                    <View
                        props={extra}
                    />
                ) : ("")}
            </>
            : <>
                <Tag {...evaluatedAttrs}>
                    {props.content &&
                        (<View
                            currentData={currentData.content ?? undefined}
                            datafield={"content"}
                            path={path + ".content"}
                            props={props.content}
                        />)}
                </Tag>
                {Object.keys(extra).length ? (
                    <View
                        props={extra}
                    />
                ) : ("")}
            </>}
    </ActionDependant>;
}

export default Html;