import {dataLocationToPath} from "../../engine/TemplateSystem";

/**
 * Moves data at the specified path.
 *
 * @param {{}} props
 */
export const moveData = (props) => {
    const {globalDataContext, templateContext} = props;
    const {path, target} = props.args;

    if (path === undefined && target !== "currentTemplateData") {
        return;
    }

    let dataAbsolutePath;

    if (path) {
        dataAbsolutePath = dataLocationToPath({
            currentPath: templateContext.templatePath,
            dataLocation: path,
            globalDataContext,
            templateContext
        });
    } else {
        // Target mode.
        dataAbsolutePath = templateContext.templatePath;

        // Dev note: could this be interesting for the other mode?
        let parentLevel = props.args.parentLevel ?? 0;

        while (parentLevel > 0) {
            --parentLevel;

            // Remove a level from the path.
            const lastIndex = dataAbsolutePath.lastIndexOf('.');

            if (lastIndex < 1) {
                // No valid path to remove. Is there a valid use case where we should remove everything?
                return;
            }

            dataAbsolutePath = dataAbsolutePath.substring(0, lastIndex);
        }
    }

    const {increment} = props.args;

    globalDataContext?.updateData({
        increment,
    }, dataAbsolutePath, "move");
};
