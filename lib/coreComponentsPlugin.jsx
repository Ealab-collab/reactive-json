import * as coreActionComponents from "./component/action";
import { coreDataMappingComponents } from "./component/dataMapping";
import { coreDataProcessorComponents } from "./component/dataProcessor";
import { coreReactionComponents } from "./component/reaction";

/**
 * Reactive-JSON core components plugin.
 */
export const coreComponentsPlugin = {
    action: coreActionComponents,
    dataMapping: coreDataMappingComponents,
    dataProcessor: coreDataProcessorComponents,
    reaction: coreReactionComponents,
};
