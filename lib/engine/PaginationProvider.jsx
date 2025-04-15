import {memo, useReducer, useRef, useState} from "react";
import PaginationContext from "./PaginationContext";

/**
 * Use this provider in combination with EventDispatcherContext.
 *
 * @param props
 *
 * @returns {JSX.Element}
 *
 * @constructor
 * @deprecated ne fonctionne pas, envisager un système de preemptiveActions pour filtrer les items en amont
 */
const PaginationProvider = (props) => {
    const {
        after,
        before,
        contentToPaginate,
        pagination,
    } = props;
    // TODO: essayer d'obtenir le nombre réel à afficher.

    // TODO: essayer d'obtenir seulement les objets à afficher. (Hide lance dispatch(remove) par ex
    const completeItemCount = contentToPaginate.length;


    // Slice for the pagination if in effect.
    const contentSlice = props?.paginated
        ? contentToPaginate.slice(pagination.firstShownItemIndex, pagination.maxShownItemIndexExcluded)
        : contentToPaginate;



    // Dev note: on PhpStorm, disregard the Function signatures inspection errors of reducers.
    // See: https://youtrack.jetbrains.com/issue/WEB-53963.
    // noinspection JSCheckFunctionSignatures
    const [itemCountAdjustment, dispatchItemCountAdjustment] = useReducer((prevState, dispatched) => {
        switch (dispatched.type) {
            case "increment":
                return prevState + 1;

            case "decrement":
                return prevState - 1;

            default:
                // Unknown type.
                return prevState;
        }
    }, {updateId: 0, realCurrentData: {}});



    return <PaginationContext.Provider value={{dispatchItemCountAdjustment, pagination}}>
        {before}
        {contentSlice}
        {after}
    </PaginationContext.Provider>;
}

// TODO: evaluate if memo is useful here.
export default PaginationProvider;
