import { ActionDependant } from "../../../engine/Actions.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { useContext } from "react";

/**
 * This is the collapse button for the sortable tree.
 *
 * It's used when SortableTree is used with a manualDrag option.
 */
export const SortableTreeItemCollapseButton = ({ props }) => {
    const templateContext = useContext(TemplateContext);

    return <ActionDependant {...props}>{templateContext.sortableTreeData._treeAddCollapseButton?.()}</ActionDependant>;
};
