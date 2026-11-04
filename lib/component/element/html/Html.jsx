import { useContext, useRef } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import {
    escapeStyleText,
    isAllowedTag,
    sanitizeAttributes,
    warnRefusedTag,
} from "../../../engine/utility/markupSecurity.js";
import { normalizeAttributesForReactJsx } from "../../../engine/utility/reactJsxHelpers.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { evaluateAttributes, evaluateTemplateValue } from "../../../engine/TemplateSystem.jsx";
import { View } from "../../../engine/View.jsx";

// The actions lists for which the unbound toggle warning has already been shown.
const warnedUnboundToggleActions = new WeakSet();

/**
 * Gets the text of a style element.
 *
 * The content is evaluated here instead of a View, to be escaped: the serialization
 * of a prerendered page writes it as is, and a "</style" in it would end the element.
 * Only text is accepted: a string, or an array of strings joined as a View renders them.
 * Like in a View, each item of an array can be a template value, and an empty value adds nothing.
 *
 * @param {*} content The content of the style element.
 * @param {{}} globalDataContext The global data context.
 * @param {{}} templateContext The template context.
 *
 * @returns {string|null} The escaped style sheet, or null when there is no text.
 */
const getStyleText = (content, globalDataContext, templateContext) => {
    const evaluate = (value) => evaluateTemplateValue({ valueToEvaluate: value, globalDataContext, templateContext });
    // A template value giving an array is rendered as is, without evaluating its items.
    const parts = (Array.isArray(content) ? content.map(evaluate) : [evaluate(content)]).flat();
    const isEmpty = (part) => part === undefined || part === null || part === "";

    if (!parts.every((part) => isEmpty(part) || typeof part === "string" || typeof part === "number")) {
        console.warn("Html: the content of a <style> element must be text; it is not rendered.");
        return null;
    }

    const text = parts.filter((part) => !isEmpty(part)).join("");

    return text === "" ? null : escapeStyleText(text);
};

/**
 * Warns when a checkbox or radio input reacts to events but nothing sets its "checked" attribute.
 *
 * Such an input is rendered as a controlled input forced to unchecked,
 * so a user click never shows as checked, whatever the reactions do to the data.
 *
 * @param {{}} props The Html element props.
 * @param {{}} attrs The attributes of the element, before evaluation.
 * @param {string} type The input type.
 */
const warnOnUnboundToggle = (props, attrs, type) => {
    const actions = props.actions;

    if (!Array.isArray(actions) || warnedUnboundToggleActions.has(actions)) {
        return;
    }

    if (attrs.hasOwnProperty("checked")) {
        // The checked attribute is bound, even when it evaluates to a falsy value.
        return;
    }

    const transforms = Array.isArray(props.attributeTransforms) ? props.attributeTransforms : [];

    if (transforms.some((transform) => transform?.name === "checked")) {
        return;
    }

    if (!actions.some((action) => action?.on !== undefined)) {
        return;
    }

    warnedUnboundToggleActions.add(actions);
    console.warn(
        `Html: an <input type="${type}"> has event reactions but no "checked" attribute nor "checked" ` +
            "attribute transform, so it always stays unchecked. Bind checked to the data " +
            '(e.g. "checked: ~.isSelected"), set it with an attributeTransforms entry, ' +
            "or use a CheckBoxField to store a list of checked values."
    );
};

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

    const evaluatedAttrs = evaluateAttributes({ attrs, globalDataContext, templateContext, options: { tagName: Tag } });

    if (props.tag === "option" && props.content && evaluatedAttrs.value === undefined) {
        // Special handling for option elements. Try to use the content as the value.
        if (typeof props.content !== "string") {
            // Content is not a simple string - discard this option.
            return null;
        }

        // Use the simple string content as the value.
        const evaluatedOptionValue = evaluateTemplateValue({
            valueToEvaluate: props.content,
            globalDataContext,
            templateContext,
        });

        if (typeof evaluatedOptionValue !== "string") {
            // Discard this option.
            return null;
        }

        evaluatedAttrs.value = evaluatedOptionValue;
    }

    if (props.tag === "input" || props.tag === "textarea" || props.tag === "select") {
        // Fix for React controlled/uncontrolled input warning.
        // Ensure form elements always have a defined value to prevent React warnings.
        if (evaluatedAttrs.value === undefined) {
            evaluatedAttrs.value = "";
        }

        // Special handling for checkbox/radio inputs - ensure 'checked' is always defined.
        if (props.tag === "input" && (evaluatedAttrs.type === "checkbox" || evaluatedAttrs.type === "radio")) {
            if (evaluatedAttrs.checked === undefined) {
                warnOnUnboundToggle(props, attrs, evaluatedAttrs.type);
                evaluatedAttrs.checked = false;
            }
        }
    }

    const { useTransformedAttributes } = globalDataContext.plugins?.hook ?? {};
    const transformedAttrs = useTransformedAttributes
        ? useTransformedAttributes(evaluatedAttrs, props.attributeTransforms ?? [])
        : evaluatedAttrs;

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

    if (!isAllowedTag(Tag)) {
        // E.g. script: the browser runs it when React creates it with another casing ("SCRIPT").
        warnRefusedTag(Tag);
        return null;
    }

    // The attribute transforms can set any attribute: check the final attributes, with the element rules.
    const safeAttrs = sanitizeAttributes(transformedAttrs, Tag);
    const lowerCaseTag = Tag.toLowerCase();

    let content;

    if (lowerCaseTag === "style") {
        content =
            props.content && getStyleText(currentData.content || props.content, globalDataContext, templateContext);
    } else if (lowerCaseTag === "iframe") {
        // The browser never displays the content of an iframe, and a prerendered page writes it as is.
        content = null;
    } else {
        content = props.content && (
            <View
                currentData={currentData.content ?? undefined}
                datafield={"content"}
                path={path + ".content"}
                props={props.content}
            />
        );
    }

    return (
        <ActionDependant {...props} attributesHolderRef={mainAttributesHolderRef}>
            {isVoidTag(props.tag) ? (
                <>
                    <Tag ref={mainAttributesHolderRef} {...safeAttrs} />
                    {Object.keys(extra).length ? <View props={extra} /> : ""}
                </>
            ) : (
                <>
                    <Tag ref={mainAttributesHolderRef} {...safeAttrs}>
                        {content}
                    </Tag>
                    {Object.keys(extra).length ? <View props={extra} /> : ""}
                </>
            )}
        </ActionDependant>
    );
};
