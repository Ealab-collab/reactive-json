import ActionDependant from "../../../engine/Actions";
import View from "../../../engine/View";

/**
 * Phantom element without DOM output.
 *
 * Use this if you want actions without a DOM element.
 *
 * @param {{}} props Build data.
 * @param currentData Current data.
 * @param path Element path.
 *
 * @constructor
 */
const Phantom = ({props, currentData, path}) => {
    return <ActionDependant {...props}>
        {props.content && <View
            props={props.content}
            currentData={currentData?.content ?? undefined}
            datafield={"content"}
            path={path + ".content"}/>}
    </ActionDependant>;
};

export default Phantom;
