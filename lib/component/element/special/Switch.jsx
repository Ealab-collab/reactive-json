import {useContext} from 'react';
import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import PaginationContext from "../../../engine/PaginationContext";
import TemplateContext from "../../../engine/TemplateContext";
import {dataLocationToPath, evaluateTemplateValue, isTemplateValue} from "../../../engine/TemplateSystem";
import View from "../../../engine/View";
import {usePagination} from "../../hook/usePagination";

const Switch = ({props, currentData, path}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

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
    const evaluatedContent = maybeContent && evaluateTemplateValue({
        globalDataContext: globalDataContext,
        templateContext: templateContext,
        valueToEvaluate: maybeContent,
    });
    const finalDataSource = typeof evaluatedContent === "object" ? evaluatedContent : currentData;

    // This will limit the values count by the config in case the data is wrong.
    const limitedContent = Object
        .entries(finalDataSource)
        .map(([dataIndex, dataEntry]) => {
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

            let finalPath = ((isTemplateValue(maybeContent) && dataLocationToPath({
                dataLocation: maybeContent,
                currentPath: templateContext.templatePath,
                globalDataContext,
                templateContext
            })) || path) + "." + realIndex;

            if (!useSingleOption) {
                finalPath += "." + dataKey;
            }

            return <View
                currentData={dataValue}
                datafield={realIndex}
                key={realIndex}
                path={finalPath}
                props={selectedOption}
            />;
        });

    const pagination = usePagination(
        {
            dataToPaginate: limitedContent,
            ...(props?.paginationProps ?? {})
        });

    // Slice for the pagination if in effect.
    const contentAsViews = props?.paginated
        ? limitedContent.slice(pagination.firstShownItemIndex, pagination.maxShownItemIndexExcluded)
        : limitedContent;

    const toRender = <>
        {props?.before && <View
            currentData={currentData?.["before"] ?? undefined}
            path={path + ".before"}
            datafield={"before"}
            props={props?.before}/>}
        {contentAsViews}
        {props?.after && <View
            currentData={currentData?.["after"] ?? undefined}
            path={path + ".after"}
            datafield={"after"}
            props={props?.after}/>}
    </>

    return <ActionDependant {...props}>
        {props?.paginated
            ? <PaginationContext.Provider value={{pagination}}>
                {toRender}
            </PaginationContext.Provider>
            : toRender}
    </ActionDependant>
};

export default Switch;
