import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {
    evaluateAttributes, useEvaluatedAttributes
} from "../../../engine/TemplateSystem";
import View from "../../../engine/View";
import {useContext} from "react";
import BsTab from 'react-bootstrap/Tab';
import BsTabs from 'react-bootstrap/Tabs';

/**
 * Tabs component using the simple Tabs component from react-bootstrap.
 *
 * The react-bootstrap's Tabs component is special as it requires a very
 * specific structure with <Tabs> directly underneath.
 *
 * @param currentData
 * @param path
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const Tabs = ({currentData, path, props}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const evaluatedAttrs = useEvaluatedAttributes(props.attributes);

    return (
        <ActionDependant {...props}>
            <BsTabs {...evaluatedAttrs}>
                {Array.isArray(props.tabs) && props.tabs.map((item, index) => {
                    const tabAttributes = evaluateAttributes({
                        attrs: item.attributes,
                        globalDataContext,
                        templateContext,
                        options: {normalizeBeforeEvaluation: true}
                    });

                    return <BsTab {...tabAttributes} key={index}>
                        <View
                            currentData={currentData?.[index]?.content ?? undefined}
                            datafield={"content"}
                            path={(path ?? "") + "." + index + ".content"}
                            props={item?.content}/>
                    </BsTab>
                })}

            </BsTabs>
        </ActionDependant>
    );
};

export default Tabs;
