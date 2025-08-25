import { useContext } from "react";
import { PaginationContext } from "../../../engine/PaginationContext.jsx";

/**
 * Displays the PageControls found in the PaginationContext, if any.
 *
 * @returns {JSX.Element|null}
 *
 * @constructor
 */
export const PageControls = () => {
    const { pagination } = useContext(PaginationContext);

    return pagination.PageControls ? <pagination.PageControls /> : null;
};
