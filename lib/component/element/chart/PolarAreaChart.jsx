import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {evaluateTemplateValue, useEvaluatedAttributes} from "../../../engine/TemplateSystem";
import {Chart, RadialLinearScale, ArcElement, Tooltip, Legend} from 'chart.js';
import {useContext} from "react";
import {PolarArea} from 'react-chartjs-2';

// Registering the necessary components for Chart.js.
Chart.register(RadialLinearScale, ArcElement, Tooltip, Legend);

const PolarAreaChart = ({props}) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const attributes = useEvaluatedAttributes(props.attributes);

    const options = props.options || {};

    const chartData = evaluateTemplateValue({
        valueToEvaluate: props.data,
        globalDataContext,
        templateContext,
    });

    return (
        <ActionDependant {...props}>
            {chartData && <PolarArea {...attributes} data={chartData} options={options}/>}
        </ActionDependant>
    );
};

export default PolarAreaChart;