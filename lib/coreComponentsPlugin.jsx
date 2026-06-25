import * as coreActionComponents from "./component/action";
import { coreAttributeTransformerComponents } from "./component/attributeTransformer";
import { coreDataMappingComponents } from "./component/dataMapping";
import { coreDataProcessorComponents } from "./component/dataProcessor";
import { coreElementComponents } from "./component/element";
import { coreHookComponents } from "./component/hook";
import { coreReactionComponents } from "./component/reaction";
import { coreUtilityComponents } from "./component/utility";

/**
 * Reactive-JSON core components plugin.
 */
export const coreComponentsPlugin = {
    action: coreActionComponents,
    attributeTransformer: coreAttributeTransformerComponents,
    dataMapping: coreDataMappingComponents,
    dataProcessor: coreDataProcessorComponents,
    element: coreElementComponents,
    hook: coreHookComponents,
    reaction: coreReactionComponents,
    utility: coreUtilityComponents,
};
