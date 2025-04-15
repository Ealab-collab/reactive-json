import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {evaluateTemplateValue} from "../../../engine/TemplateSystem";
import View from "../../../engine/View";
import {propsDataLocationToPathAndValue} from "../form/formElementsCommon";
// clsx is included in dnd-kit-sortable-tree.
import clsx from "clsx";
import {FolderTreeItemWrapper} from "dnd-kit-sortable-tree";
import {SortableTree} from "dnd-kit-sortable-tree";
import {cloneDeep} from "lodash";
import React, {forwardRef, useContext} from "react";

const FolderSortableTree = ({props, path, datafield}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    let {
        formData: treeData,
        formDataPath: treeDataPath,
    } = propsDataLocationToPathAndValue({
        currentPath: path,
        datafield: datafield,
        dataLocation: props.dataLocation,
        defaultValue: props.defaultFieldValue,
        globalDataContext,
        templateContext,
    });

    if (treeData === undefined) {
        // Empty tree data.
        return null;
    }

    /**
     * Template (the usual structure given to View props) that will be used for each tree item.
     *
     * @type {*|null}
     */
    const itemTemplate = props.itemTemplate ?? null;

    /**
     * This value is needed when the user wants to limit the data rendered in this tree.
     *
     * @type {string|undefined|*}
     */
    const treeRootPath = evaluateTemplateValue({
        valueToEvaluate: props.treeRootPath ?? undefined,
        globalDataContext,
        templateContext
    });

    /**
     * Sets the maximum depth. Optional.
     *
     * "maxDepth" is not a native SortableTree option;
     * that is why it is not under the sortableTreeOptions key.
     * Please note that it will not fix the data until a drag and drop interaction.
     *
     * @type {number}
     */
    const maxDepth = props.maxDepth;

    /**
     * Tells if the given maxDepth is expressed in absolute or relative base.
     *
     * If false, the maxDepth will be used to limit the depth relative to the tree root item
     * determined by treeRootItem. If true, the depth will be limited starting from the root
     * item given by treeData.
     *
     * @type {boolean}
     */
    const maxDepthIsAbsolute = (typeof treeRootPath !== "string") ? true : (props.maxDepthIsAbsolute ?? true);

    /**
     * Tells if we want to keep the base item when "treeRootPath" is defined.
     *
     * Set this to true to keep in the tree the item
     * that "treeRootPath" (if set) will use as the tree root.
     * When false, the base tree items will be the
     * children of this base item instead.
     *
     * @type {boolean}
     */
    const keepBaseItem = props.keepBaseItem ?? false;

    /*
     * Used by the max depth limiter and the trees filtered by treeRootPath.
     */
    let baseDepth = 0;

    /*
     * Useful when the treeRootPath option is active.
     * This is the item id that will be set back during the "onItemsChanged" event
     * on the base elements.
     */
    let baseParentId = null;

    let baseItemIndex = undefined;

    if (typeof treeRootPath === "string" && treeRootPath.length > 0) {
        // A tree root path has been specified.
        const pathSplitted = treeRootPath.split(".");

        let baseParentId_previous = baseParentId;
        let treeData_previous = treeData;
        let treeDataPath_previous = treeDataPath;

        while (pathSplitted.length > 0) {
            const index = Number.parseInt(pathSplitted.shift());

            if (Number.isNaN(index)) {
                // This value is invalid. Do not even try to load the tree.
                return null;
            }

            // The "previous" values are used for the "keepBaseItem" option.
            baseParentId_previous = treeData?.["id"] ?? null;
            treeData_previous = treeData;
            treeDataPath_previous = treeDataPath;
            baseItemIndex = index;

            baseParentId = treeData[index]?.["id"];
            treeData = treeData[index]?.["children"] ?? undefined;
            treeDataPath = treeDataPath + "." + index + ".children";

            if (treeData === undefined) {
                // No tree to render.
                return null;
            }

            ++baseDepth;
        }

        if (keepBaseItem) {
            // Use the "previous" values.
            baseParentId = baseParentId_previous;
            treeData = treeData_previous;
            treeDataPath = treeDataPath_previous;

            // Remove all items but the one identified by "indexToKeep".
            // This item will be indexed at 0 for SortableTree.
            treeData = [treeData[baseItemIndex]];
        }
    }

    const onItemsChanged = (e) => {
        let finalData = e;
        let finalDataPath = treeDataPath;

        if (baseDepth > 0) {
            // Fix the depths of all the items by adding baseDepth.
            // Also fix the parentId if we have the treeRootPath option active.
            finalData = cloneDeep(finalData);

            const recursiveFixer = (it, currentDepth = 0) => {
                if (currentDepth === 0) {
                    it.parentId = baseParentId;
                }

                it.depth += baseDepth;

                it.children?.forEach((child) => {
                    recursiveFixer(child, currentDepth + 1);
                });
            };

            finalData.forEach((child) => {
                recursiveFixer(child, 0);
            });
        }

        if ((treeRootPath !== undefined) && keepBaseItem) {
            // We are in a partial tree configuration,
            // and this tree has the base item kept in the hierarchy.
            // Fix the data and paths.
            // We take the first and only item.
            finalData = e[0];
            finalDataPath = treeDataPath + "." + baseItemIndex;
        }

        globalDataContext.updateData(finalData, finalDataPath);
    }

    const GenericTreeItemComponent = forwardRef((props, ref) => {
        const finalCurrentData = props.item.value ?? {};

        // Rebuild the data path by inspecting the parents.
        const parentsIndices = [];

        let itemToInspect = props.item;
        parentsIndices.push(itemToInspect.index);

        while (itemToInspect.parent) {
            parentsIndices.push("children");
            itemToInspect = itemToInspect.parent;
            parentsIndices.push(itemToInspect.index);
        }

        // Reverse the order.
        parentsIndices.reverse();

        // This is the path leading to the "value" key excluded.
        const finalValuePath = treeDataPath + "." + parentsIndices.join(".");

        // This is the full path, "value" included.
        const finalDataPath = finalValuePath + ".value";

        finalCurrentData._treeItemDepth = props.item.depth;
        finalCurrentData._treeItemIndex = props.item.index;
        finalCurrentData._treeItemIndex1 = props.item.index + 1;

        // Put the collapse button into the template data.
        // This is the stylable button which serves as a collapse switch.
        // The implementation is taken directly from the FolderTreeItemWrapper component.
        // We can then include the collapse button in the item
        // thanks to the SortableTreeItemCollapseButton component.
        const sortableTreeData = {};

        sortableTreeData._treeAddCollapseButton = () => (
            !!props.onCollapse && !!props.childCount &&
            <button
                onClick={(e) => {
                    e.preventDefault();
                    props.onCollapse?.();
                }}
                className={clsx(
                    'dnd-sortable-tree_folder_tree-item-collapse_button',
                    props.collapsed &&
                    'dnd-sortable-tree_folder_tree-item-collapse_button-collapsed'
                )}/>
        );

        if (maxDepth) {
            // A maximum depth has been defined for this tree.
            if (maxDepthIsAbsolute) {
                props.item.canHaveChildren = (baseDepth + props.item.depth) < maxDepth;
            } else {
                props.item.canHaveChildren = (props.item.depth) < maxDepth;
            }
        }

        return (
            <FolderTreeItemWrapper
                {...props}
                data-htmlbuilder-tree-item-children-count={props.childCount || "0"}
                data-htmlbuilder-tree-item-collapsed={props.collapsed}
                data-htmlbuilder-tree-item-depth={props.item.depth}
                data-htmlbuilder-tree-item-depth-list={getDepthAsList(props.item.depth)}
                data-htmlbuilder-tree-item-index={props.item.index}
                data-htmlbuilder-tree-item-index1={props.item.index + 1}
                data-htmlbuilder-tree-item-is-last={props.isLast}
                ref={ref}>
                <TemplateContext.Provider value={{
                    templateData: finalCurrentData,
                    templatePath: finalDataPath,
                    sortableTreeData: sortableTreeData
                }}>
                    <View
                        props={itemTemplate}
                        currentData={finalCurrentData}
                    />
                </TemplateContext.Provider>
            </FolderTreeItemWrapper>
        );
    });

    // Deep copy because SortableTree seems to directly edit the data.
    const clone = cloneDeep(treeData);

    // Additional properties for SortableTree.
    const sortableTreeOptions = props.sortableTreeOptions ?? {};

    return (
        <ActionDependant {...props}>
            <SortableTree
                {...sortableTreeOptions}
                items={clone}
                onItemsChanged={onItemsChanged}
                TreeItemComponent={GenericTreeItemComponent}/>
        </ActionDependant>
    );
};

/**
 * Builds a list of depths such as 4 => "0 1 2 3 4".
 *
 * This can be used as an attribute value, for the CSS word selector "~=".
 * E.g.: [data-htmlbuilder-tree-item-depth-list~=3].
 *
 * @param {int} itemDepth The item depth.
 *
 * @returns {string} The string of depths.
 */
function getDepthAsList(itemDepth) {
    const depthAsList = [];
    let remainingDepth = itemDepth ?? 0;

    while (remainingDepth >= 0) {
        depthAsList.push(remainingDepth);
        --remainingDepth;
    }

    return depthAsList.reverse().join(" ");
}

export default FolderSortableTree;
