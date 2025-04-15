import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {evaluateTemplateValue} from "../../../engine/TemplateSystem";
import parse from 'html-react-parser';
import React, {useContext} from 'react';

/**
 * List of tags that are allowed by default.
 *
 * @type {string[]}
 */
const defaultHtmlTagAllowList = [
    "abbr", "acronym", "b", "blockquote", "br", "caption", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
    "i", "li", "ol", "p", "span", "sup", "strong", "table", "tbody",
    "td", "tfoot", "th", "thead", "tr", "ul",
];

/**
 * Preformatted markup component that takes content and inserts it as HTML.
 */
const PreformattedMarkup = ({props}) => {
    const templateContext = useContext(TemplateContext);
    const globalDataContext = useContext(GlobalDataContext);

    const html = evaluateTemplateValue({valueToEvaluate: props.content, templateContext, globalDataContext});

    // Allow the base list to be overridden. Useful to disallow all tags, by supplying an empty array.
    const htmlTagAllowList = Array.isArray(props.htmlTagAllowList) ? props.htmlTagAllowList : defaultHtmlTagAllowList;

    // Allow the list to be extended with the additionalAllowedTags component property.
    const completeTagAllowList = [...htmlTagAllowList, ...(props.additionalAllowedTags ?? [])]

    return (
        <ActionDependant {...props}>
            {parse(html, {
                replace(domNode) {
                    /*
                     * Filter tags to remove any risk about rendering dangerous markup.
                     * Attributes (e.g. onclick) do not need to be filtered because they are not parsed as code:
                     * https://github.com/remarkablemark/html-react-parser/issues/73#issuecomment-426119592
                     */
                    if (domNode.type === "tag" && completeTagAllowList.indexOf(domNode.name) < 0) {
                        // Not an allowed tag.
                        // Replace by a fragment which will effectively replace by nothing.
                        return <></>;
                    }
                }
            })}
        </ActionDependant>
    )
}

export default PreformattedMarkup;
