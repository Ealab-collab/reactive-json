import JSONPath from "jsonpath";
import {useContext} from "react";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {maybeFormatString} from "../../utility/formatString";

/**
 * Returns a count for something to count.
 *
 * @param props Component build data.
 *
 * @returns {null|*}
 *
 * @constructor
 */
const Count = ({props}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const {
        context = "global",
        jsonPathPattern: _jsonPathPattern,
    } = props;

    const _selectedContext = context === "template" ? TemplateContext : GlobalDataContext;
    const selectedContext = useContext(_selectedContext);

    if (!_jsonPathPattern) {
        return null;
    }

    const jsonPathPattern = maybeFormatString({
        templateContexts: {
            globalDataContext,
            templateContext
        }
    }, _jsonPathPattern);

    const selectedContextData = context === "root" ? selectedContext.getRootContext().templateData : selectedContext.templateData;

    const result = JSONPath.query(selectedContextData, jsonPathPattern);

    return result.length;
};

export default Count;
