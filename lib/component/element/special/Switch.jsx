import { createElement, useContext, useEffect, useState } from "react";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { PaginationContext } from "../../../engine/PaginationContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import {
    dataLocationToPath,
    evaluateAttributes,
    evaluateTemplateValue,
    isTemplateValue,
} from "../../../engine/TemplateSystem.jsx";
import {
    isAllowedTag,
    isRawTextTag,
    sanitizeAttributes,
    warnRefusedTag,
} from "../../../engine/utility/markupSecurity.js";
import { View } from "../../../engine/View.jsx";

/**
 * Tells if an element can hold the content of a Switch: the refused elements and those holding raw text cannot.
 *
 * @param {string} tagName The element name.
 *
 * @returns {boolean} True if the element can hold the content.
 */
const isAllowedWrapperTag = (tagName) => isAllowedTag(tagName) && !isRawTextTag(tagName);

/**
 * Checks the pagination props given by the RjBuild with the rules of the evaluated attributes.
 *
 * The usePagination hook renders these props as is: containerProps and itemProps are attributes,
 * and the customComponents given by name (a string) are elements.
 *
 * @param {{}} paginationProps The paginationProps of the Switch.
 *
 * @returns {{}} The props to give to usePagination.
 */
const sanitizePaginationProps = (paginationProps) => {
    if (typeof paginationProps !== "object" || paginationProps === null) {
        return {};
    }

    const { customComponents, containerProps, itemProps, ...options } = paginationProps;
    const sanitized = { ...options };

    if (typeof customComponents === "object" && customComponents !== null) {
        sanitized.customComponents = Object.fromEntries(
            Object.entries(customComponents).filter(([, component]) => {
                if (typeof component !== "string" || isAllowedWrapperTag(component)) {
                    return true;
                }

                warnRefusedTag(component);
                return false;
            })
        );
    }

    // The element-dependent rules apply when the element is known, i.e. given by name.
    const tagNameOf = (component) => (typeof component === "string" ? component : undefined);

    if (containerProps !== undefined) {
        sanitized.containerProps = sanitizeAttributes(containerProps, tagNameOf(sanitized.customComponents?.Container));
    }

    if (itemProps !== undefined) {
        sanitized.itemProps = sanitizeAttributes(itemProps, tagNameOf(sanitized.customComponents?.Item));
    }

    return sanitized;
};

export const Switch = ({ props, currentData, path }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    
    const { usePagination } = globalDataContext.plugins?.hook ?? {};

    if (!usePagination) {
        // No pagination hook found.
        return null;
    }

    // The allowed item count. Any value less than 1 means infinite.
    const cardinality = props?.cardinality ?? -1;

    // The allowed sub items for this switch.
    const options = props?.options ?? [];
    const singleOption = props?.singleOption ?? undefined;

    // This will tell if singleOption should be used.
    const useSingleOption = !!singleOption;

    // The content property is used to pinpoint on a template data value.
    // This is not mandatory; the data can still set the selected value(s)
    // by the usual overwrite by using the same render array structure.
    const maybeContent = props?.content ?? null;
    const evaluatedContent =
        maybeContent &&
        evaluateTemplateValue({
            globalDataContext: globalDataContext,
            templateContext: templateContext,
            valueToEvaluate: maybeContent,
        });
    const finalDataSource = typeof evaluatedContent === "object" ? evaluatedContent : currentData;

    // This will limit the values count by the config in case the data is wrong.
    const limitedContent = Object.entries(finalDataSource).map(([dataIndex, dataEntry]) => {
        const realIndex = dataIndex;

        if (cardinality >= 1 && realIndex >= cardinality) {
            // Ignore the data entry.
            return null;
        }

        if (!dataEntry || typeof dataEntry !== "object") {
            // Invalid entries count in the cardinality check.
            // If we don't want them counted, we need to change the cardinality check itself
            // which is currently based on the data index.
            return null;
        }

        let dataKey;
        let dataValue;
        let selectedOption;

        if (useSingleOption) {
            dataValue = dataEntry;
            selectedOption = singleOption;
        } else {
            dataKey = Object.keys(dataEntry)[0] ?? undefined;

            if (dataKey === undefined) {
                // Render nothing.
                return null;
            }

            dataValue = Object.values(dataEntry)[0] ?? undefined;
            selectedOption = options[dataKey] ?? undefined;
        }

        if (selectedOption === undefined) {
            // Render nothing.
            return null;
        }

        let finalPath =
            ((isTemplateValue(maybeContent) &&
                dataLocationToPath({
                    dataLocation: maybeContent,
                    currentPath: templateContext.templatePath,
                    globalDataContext,
                    templateContext,
                })) ||
                path) +
            "." +
            realIndex;

        if (!useSingleOption) {
            finalPath += "." + dataKey;
        }

        return (
            <View
                currentData={dataValue}
                datafield={realIndex}
                key={realIndex}
                path={finalPath}
                props={selectedOption}
            />
        );
    });

    const pagination = usePagination({
        dataToPaginate: limitedContent,
        ...sanitizePaginationProps(props?.paginationProps),
    });

    // Slice for the pagination if in effect.
    const contentAsViews = props?.paginated
        ? limitedContent.slice(pagination.firstShownItemIndex, pagination.maxShownItemIndexExcluded)
        : limitedContent;

    // Wrap the content if specified.
    const wrapperTag = props?.contentWrapper?.tag ?? "div";
    // The refused elements, and those holding raw text (style, iframe), cannot wrap the content.
    const isWrapperAllowed = isAllowedWrapperTag(wrapperTag);

    if (props?.contentWrapper && !isWrapperAllowed) {
        warnRefusedTag(wrapperTag);
    }

    const maybeWrappedContent =
        props?.contentWrapper && isWrapperAllowed
            ? createElement(
                  wrapperTag,
                  evaluateAttributes({
                      attrs: props.contentWrapper.attributes ?? {},
                      globalDataContext,
                      // With the tag, the attributes are checked with the rules of the element.
                      options: { normalizeBeforeEvaluation: true, tagName: wrapperTag },
                      templateContext,
                  }),
                  contentAsViews
              )
            : contentAsViews;

    const toRender = (
        <>
            {props?.before && (
                <View
                    currentData={currentData?.["before"] ?? undefined}
                    path={path + ".before"}
                    datafield={"before"}
                    props={props?.before}
                />
            )}
            {maybeWrappedContent}
            {props?.after && (
                <View
                    currentData={currentData?.["after"] ?? undefined}
                    path={path + ".after"}
                    datafield={"after"}
                    props={props?.after}
                />
            )}
        </>
    );

    return (
        <ActionDependant {...props}>
            {props?.paginated ? (
                <PaginationContext.Provider value={{ pagination }}>{toRender}</PaginationContext.Provider>
            ) : (
                toRender
            )}
        </ActionDependant>
    );
};
