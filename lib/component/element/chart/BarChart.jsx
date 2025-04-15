import ActionDependant from "../../../engine/Actions";
import GlobalDataContext from "../../../engine/GlobalDataContext";
import TemplateContext from "../../../engine/TemplateContext";
import {evaluateTemplateValue, useEvaluatedAttributes} from "../../../engine/TemplateSystem";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from "chart.js";
import {useContext} from "react";
import {Bar} from "react-chartjs-2";

// Register the necessary modules for Chart.js.
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChart = ({props}) => {
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
            {chartData && <Bar {...attributes} data={chartData} options={options}/>}
        </ActionDependant>
    );
};

export default BarChart;
