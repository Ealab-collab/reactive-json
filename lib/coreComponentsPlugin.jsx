import { coreDataMappingComponents } from "./component/dataMapping";
import { coreDataProcessorComponents } from "./component/dataProcessor";

/**
 * Reactive-JSON core components plugin.
 */
export const coreComponentsPlugin = {
    dataMapping: coreDataMappingComponents,
    dataProcessor: coreDataProcessorComponents,
};
