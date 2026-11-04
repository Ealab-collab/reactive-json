import parse from "html-react-parser";
import { useContext } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { evaluateTemplateValue } from "../../../engine/TemplateSystem.jsx";
import { isAllowedTag, sanitizeAttributes } from "../../../engine/utility/markupSecurity.js";

/**
 * List of tags that are allowed by default.
 *
 * @type {string[]}
 */
const defaultHtmlTagAllowList = [
    "abbr",
    "acronym",
    "b",
    "blockquote",
    "br",
    "caption",
    "code",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "i",
    "li",
    "ol",
    "p",
    "span",
    "sup",
    "strong",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
];

/**
 * The parsed node types of the elements.
 *
 * @type {Set<string>}
 */
const elementNodeTypes = new Set(["script", "style", "tag"]);

/**
 * Preformatted markup component that takes content and inserts it as HTML.
 */
export const PreformattedMarkup = ({ props }) => {
    const templateContext = useContext(TemplateContext);
    const globalDataContext = useContext(GlobalDataContext);

    const html = evaluateTemplateValue({ valueToEvaluate: props.content, templateContext, globalDataContext });

    if (typeof html !== "string") {
        console.error("PreformattedMarkup: the given content is not a string.");
        return null;
    }

    // Allow the base list to be overridden. Useful to disallow all tags, by supplying an empty array.
    const htmlTagAllowList = Array.isArray(props.htmlTagAllowList) ? props.htmlTagAllowList : defaultHtmlTagAllowList;

    // Allow the list to be extended with the additionalAllowedTags component property.
    const completeTagAllowList = [...htmlTagAllowList, ...(props.additionalAllowedTags ?? [])];

    return (
        <ActionDependant {...props}>
            {parse(html, {
                replace(domNode) {
                    /*
                     * Filter tags to remove any risk about rendering dangerous markup.
                     * The parser gives the script and style elements their own node type.
                     */
                    if (!elementNodeTypes.has(domNode.type)) {
                        return;
                    }

                    if (completeTagAllowList.indexOf(domNode.name) < 0 || !isAllowedTag(domNode.name)) {
                        // Not an allowed tag. A script is never allowed, even when listed.
                        // Replace by a fragment which will effectively replace by nothing.
                        return <></>;
                    }

                    // React ignores the string event handlers of the known elements only, and lets
                    // srcdoc through: remove the attributes that could run code.
                    domNode.attribs = sanitizeAttributes(domNode.attribs, domNode.name);
                },
            })}
        </ActionDependant>
    );
};
