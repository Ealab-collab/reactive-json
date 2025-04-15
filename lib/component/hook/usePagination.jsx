import {Pagination} from "react-bootstrap";
import React, {useState} from "react";

/**
 * Use this hook to create paginations.
 *
 * @param [Array] dataToPaginate The complete data to paginate.
 * @param [int] forcePaginationDisplay Set to true to force the pagination even when having less than 2 pages.
 * @param [int] maxPageButtonsCount The maximum page buttons count. Must be at least 1. Defaults to 5 when undefined.
 * @param [int] pageMaxItemCount The maximum item count per page. Defaults to 10 when undefined.
 *
 * @returns {{
 *     firstShownItemIndex: number,
 *     getPageCountForContent: (function(Array): number),
 *     maxShownItemIndexExcluded: number,
 *     PageControls: (function({pageCount: *})),
 *     pageMaxItemCount: number,
 *     sliceVisibleContent: ((function(Array): *)|*),
 * }}
 */
export const usePagination = ({
                                  dataToPaginate = [],
                                  forcePaginationDisplay = false,
                                  maxPageButtonsCount = 5,
                                  pageMaxItemCount = 10,
                              }) => {
    // TODO: la pagination ne se met pas à jour quand les filtres sont changés (currentData).
    const [activePageNumber0, setActivePageNumber0] = useState(0);

    /**
     * Count of page buttons that shall appear before and after the current page.
     *
     * When the current page is near the start or the end, this value is ignored
     * to show "maxPageButtonsCount" buttons.
     *
     * For example, when we have maxPageButtonsCount at 5, and 10 pages:
     * - When at active page 1, 2, 3: [1,2,3,4,5].
     * - When at active page 4, 5, 6, 7, 5 page buttons will appear, but shifted accordingly to the active page:
     *   - page 4: [2,3,4,5,6]
     *   - page 5: [3,4,5,6,7]
     *   - page 6: [4,5,6,7,8]
     *   - page 7: [5,6,7,8,9]
     * - When at active page 8, 9, 10: [6,7,8,9,10].
     *
     * @type {number}
     */
    const buttonsBeforeAfterMaxCount = Math.floor(maxPageButtonsCount / 2);

    /**
     * Index of the first item in the given content to show for the active page.
     *
     * This value is ready for slice()'s start.
     *
     * @type {number}
     */
    const firstShownItemIndex = activePageNumber0 * pageMaxItemCount;

    /**
     * Index of the last item + 1 in the given content to show for the active page.
     *
     * This value is ready for slice()'s end.
     *
     * @type {number}
     */
    const maxShownItemIndexExcluded = firstShownItemIndex + pageMaxItemCount;

    /**
     * Gets the expected page count for the given content.
     *
     * @param {Array} contentSource The content to paginate.
     *
     * @returns {number} The page count.
     */
    const getPageCountForContent = (contentSource) => {
        // Use ceil to have one last page for remaining items.
        return Math.ceil(contentSource.length / pageMaxItemCount);
    };

    /**
     * Slices the given content with the parameters of this pagination.
     *
     * Useful if the content array is complete.
     * If not, it may be better to work directly in the component
     * so that the hidden items are not computed for nothing.
     *
     * @param {Array} contentToSlice
     * @returns {*}
     */
    const sliceVisibleContent = (contentToSlice) => {
        if (!Array.isArray(contentToSlice)) {
            // Not an array. Not supported.
            return contentToSlice;
        }

        return contentToSlice.slice(firstShownItemIndex, maxShownItemIndexExcluded);
    };

    /**
     * Component which contains the page controls (previous, next, pages).
     *
     * @returns {JSX.Element}
     *
     * @constructor
     */
    const PageControls = () => {
        const pageCount = getPageCountForContent(dataToPaginate);

        if (!forcePaginationDisplay && (pageCount <= 1)) {
            return null;
        }

        return <Pagination>
            <Pagination.First
                disabled={activePageNumber0 <= 0}
                onClick={() => {
                    setActivePageNumber0(0);
                }}/>
            <Pagination.Prev
                disabled={activePageNumber0 <= 0}
                onClick={() => {
                    setActivePageNumber0(activePageNumber0 - 1);
                }}/>
            {Math.min(activePageNumber0 - buttonsBeforeAfterMaxCount, pageCount - maxPageButtonsCount) > 0 ?
                <Pagination.Ellipsis disabled/> : null}
            {(() => {
                const intermediateButtons = [];

                // The first button is the leftmost visible button.
                // It is either 0,
                // or the current page minus buttonsBeforeAfterMaxCount,
                // or maxPageButtonsCount starting from the end.
                let currentPageButtonNumber0 = Math.min(Math.max(0, pageCount - maxPageButtonsCount), Math.max(0, activePageNumber0 - buttonsBeforeAfterMaxCount));
                let remainingPagesToBuildButton = maxPageButtonsCount;

                const insertPageButton = (currentPageButtonNumber0, remainingPagesToBuildButton) => {
                    intermediateButtons.push(<Pagination.Item
                        active={activePageNumber0 === currentPageButtonNumber0}
                        key={maxPageButtonsCount - remainingPagesToBuildButton}
                        onClick={() => {
                            setActivePageNumber0(currentPageButtonNumber0)
                        }}
                    >
                        {currentPageButtonNumber0 + 1}
                    </Pagination.Item>);
                };

                while (remainingPagesToBuildButton) {
                    insertPageButton(currentPageButtonNumber0, remainingPagesToBuildButton);

                    ++currentPageButtonNumber0;
                    --remainingPagesToBuildButton;

                    if (currentPageButtonNumber0 >= pageCount) {
                        // Reached the end of the pages.
                        break;
                    }
                }

                return intermediateButtons;
            })()}
            {pageCount > Math.max(buttonsBeforeAfterMaxCount, activePageNumber0) + Math.ceil(maxPageButtonsCount / 2) ?
                <Pagination.Ellipsis disabled/> : null}
            <Pagination.Next
                disabled={activePageNumber0 + 1 >= pageCount}
                onClick={() => {
                    setActivePageNumber0(activePageNumber0 + 1);
                }}/>
            <Pagination.Last
                disabled={activePageNumber0 + 1 >= pageCount}
                onClick={() => {
                    setActivePageNumber0(pageCount - 1);
                }}/>
        </Pagination>
    };

    return {
        firstShownItemIndex,
        getPageCountForContent,
        maxShownItemIndexExcluded,
        PageControls,
        pageMaxItemCount,
        sliceVisibleContent,
    };
};
