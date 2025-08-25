import * as debugComponents from "./debug";
import * as htmlComponents from "./html";
import * as specialComponents from "./special";

/**
 * Reactive-json core element components.
 */
export const coreElementComponents = {
    ...debugComponents,
    ...htmlComponents,
    ...specialComponents,
};

export * from "./debug";
export * from "./html";
export * from "./special";
