import {useContext} from "react";
import PaginationContext from "../../../engine/PaginationContext";

/**
 * Displays the PageControls found in the PaginationContext, if any.
 *
 * @returns {JSX.Element|null}
 *
 * @constructor
 */
const PageControls = () => {
    const {pagination} = useContext(PaginationContext);

    return pagination.PageControls
        ? <pagination.PageControls/>
        : null;
};

export default PageControls;
