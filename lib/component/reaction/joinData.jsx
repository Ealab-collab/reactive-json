import { dataLocationToPath, interpolateSegmentsInContext } from "../../engine/TemplateSystem.jsx";

/**
 * Writes a string built from parts at the specified path.
 *
 * The parts are segments, like the `src` of additionalDataSource (see interpolateSegmentsInContext):
 * literal strings, template references (`~.slug`, `~~.id`...), `{segment, required}`
 * and `{param, value, required}` objects. An empty reference adds an empty string;
 * an empty required segment cancels the write.
 *
 * @param {{}} props
 */
export const joinData = (props) => {
    const { globalDataContext, templateContext } = props;
    const { parts, path } = props.args;

    if (path === undefined) {
        console.warn('joinData: the "path" argument is required.');
        return;
    }

    if (parts === undefined || parts === null) {
        return;
    }

    const joined = interpolateSegmentsInContext({
        segments: Array.isArray(parts) ? parts : [parts],
        globalDataContext,
        templateContext,
        label: "joinData",
    });

    if (joined === null) {
        // Aborted by a required segment.
        return;
    }

    const dataAbsolutePath = dataLocationToPath({
        currentPath: templateContext.templatePath,
        dataLocation: path,
        globalDataContext,
        templateContext,
    });

    globalDataContext?.updateData(joined, dataAbsolutePath);
};
