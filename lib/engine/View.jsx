import {useContext} from 'react';
import BarChart from "../component/element/chart/BarChart";
import DoughnutChart from "../component/element/chart/DoughnutChart";
import PolarAreaChart from "../component/element/chart/PolarAreaChart";
import CheckBoxField from "../component/element/form/CheckBoxField";
import DateField from "../component/element/form/DateField";
import NumberField from "../component/element/form/NumberField";
import SelectField from "../component/element/form/SelectField";
import TextAreaField from "../component/element/form/TextAreaField";
import TextField from "../component/element/form/TextField";
import AccordionItem from "../component/element/html/AccordionItem";
import FolderSortableTree from "../component/element/html/FolderSortableTree";
import FormatNumeral from "../component/element/html/FormatNumeral";
import Html from "../component/element/html/Html";
import LabelFromValue from "../component/element/html/LabelFromValue";
import Modal from "../component/element/html/Modal";
import Paragraph from "../component/element/html/Paragraph";
import PreformattedMarkup from "../component/element/html/PreformattedMarkup";
import SortableTreeItemCollapseButton from "../component/element/html/SortableTreeItemCollapseButton";
import Tabs from "../component/element/html/Tabs";
import BootstrapElement from "../component/element/special/BootstrapElement";
import Count from "../component/element/special/Count";
import DataFilter from "../component/element/special/DataFilter";
import DelayedActions from "../component/element/special/DelayedActions";
import PageControls from "../component/element/special/PageControls";
import Phantom from "../component/element/special/Phantom";
import Switch from "../component/element/special/Switch";
import GlobalDataContext from "./GlobalDataContext";
import TemplateContext from "./TemplateContext";
import TemplateValue, {dataLocationToPath, evaluateTemplateValue} from "./TemplateSystem";
import {
    Accordion,
    Alert,
    Badge,
    Button,
} from "react-bootstrap";
import LineChart from "../component/element/chart/LineChart";

const components = {
    AccordionItem,
    BarChart,
    CheckBoxField,
    Count,
    DateField,
    DataFilter,
    DelayedActions,
    DoughnutChart,
    FolderSortableTree,
    FormatNumeral,
    Html,
    LabelFromValue,
    LineChart,
    Modal,
    NumberField,
    PageControls,
    Paragraph,
    Phantom,
    PolarAreaChart,
    PreformattedMarkup,
    SelectField,
    SortableTreeItemCollapseButton,
    Switch,
    Tabs,
    TextAreaField,
    TextField,
};

/**
 * Gives direct access to React Bootstrap components.
 */
const bootstrapComponents = {
    BsAccordion: Accordion,
    BsAlert: Alert,
    BsBadge: Badge,
    BsButton: Button,
};

function View({props, currentData, datafield, path}) {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);

    const {element} = globalDataContext;

    if (currentData === undefined) {
        currentData = "";
    }

    if (props?.type) {
        // A type is specified.
        // First, try to find a component matching the given type by name.
        // When not found, we map to a Html component as fallback.
        let componentRegistryId = undefined;
        let ComponentToRender = undefined;

        const componentRegistries = [
            {"registryId": "module", "components": components},
            {"registryId": "bootstrap", "components": bootstrapComponents},
        ];

        while (componentRegistries.length) {
            const {registryId, components: registryComponents} = componentRegistries.shift();

            ComponentToRender = registryComponents[props.type] ?? undefined;

            if (ComponentToRender !== undefined) {
                componentRegistryId = registryId;
                break;
            }
        }

        if (ComponentToRender === undefined) {
            // Use the module:Html component as fallback.
            ComponentToRender = Html;
            componentRegistryId = "module";
        }

        if (componentRegistryId === "bootstrap") {
            return <BootstrapElement
                bsComponent={ComponentToRender}
                path={path}
                props={props}
                currentData={currentData}
                datafield={datafield}/>;
        }

        if (Html === ComponentToRender) {
            // Either the user has specifically asked for a Html component,
            // or this is a fallback for an unknown type.
            // Make sure the tag is set.
            props.tag = props.tag ?? props.type;
        }

        return <ComponentToRender
            path={path}
            props={props}
            currentData={currentData}
            datafield={datafield}/>;
    }

    if (props?.load) {
        // An external render source must be loaded.
        // let load = props.load;
        let loadedRenderArray;

        const _customDataLocation = props?.customDataLocation ?? undefined;
        if (_customDataLocation) debugger;

        // Determine which data to use.
        const finalCurrentData = _customDataLocation
            // The data is located somewhere in the current data.
            ? evaluateTemplateValue({
                globalDataContext: globalDataContext,
                templateContext: templateContext,
                valueToEvaluate: _customDataLocation,
            })
            // The data is the current data.
            : currentData;

        // The data path must be set accordingly.
        const finalDataPath = _customDataLocation
            ? dataLocationToPath({dataLocation: _customDataLocation, currentPath: path, globalDataContext, templateContext})
            : path;

        // This external source can return a single component to render,
        // or a collection of components.
        if (typeof props.load === "function") {
            // A JS function has been defined. Execute it with the currentData.
            // The function must return a render array.
            loadedRenderArray = props.load(finalCurrentData);
        } else {
            // Load the render array from the registry.
            loadedRenderArray = element[props.load];
        }

        // Override any values of the registry render array with the current render array,
        // without the properties specific to the "load" method.
        const {load, customDataLocation, ...propsWithoutLoadKey} = props;
        loadedRenderArray = {...loadedRenderArray, ...propsWithoutLoadKey};

        // Now that we have our render array, recurse on the View component.
        if (props.keepTemplateContext) {
            // Keep the current template context.
            return (
                <View
                    currentData={finalCurrentData}
                    datafield={datafield}
                    path={finalDataPath}
                    props={loadedRenderArray}
                />
            );
        }

        // We open a new template context in the process.
        return (
            <TemplateContext.Provider value={{templateData: finalCurrentData, templatePath: finalDataPath}}>
                <View
                    currentData={finalCurrentData}
                    datafield={datafield}
                    path={finalDataPath}
                    props={loadedRenderArray}
                />
            </TemplateContext.Provider>
        );
    }

    // Try to go deeper to render something.
    if (Array.isArray(props)) {
        return props.map((item, index) =>
            <View
                currentData={currentData[index] ?? undefined}
                datafield={index}
                key={path + "." + index}
                path={path + "." + index}
                props={item ?? undefined}
            />
        );
    }

    if (typeof props === "object") {
        return Object.entries(props).map(([itemKey, item]) => {
                return <View
                    currentData={currentData[itemKey] ?? undefined}
                    datafield={itemKey ?? undefined}
                    key={path + "." + itemKey}
                    path={path + "." + itemKey}
                    props={item}
                />
            }
        );
    }

    // Display the content directly.
    // The content tries to use the currentData in case the data wants to rewrite the output.
    // If not available, we simply use the given props, which is usually a string, which can
    // also be a reference to a template context data.
    // If no props is available, do not render anything.
    return <TemplateValue valueToEvaluate={currentData || (props ?? null)}/>;
}

export default View;