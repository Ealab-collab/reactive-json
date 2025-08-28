import * as debugComponents from "./debug";
import * as formComponents from "./form";
import * as htmlComponents from "./html";
import * as specialComponents from "./special";

/**
 * Reactive-json core element components.
 */
export const coreElementComponents = {
    ...debugComponents,
    ...formComponents,
    ...htmlComponents,
    ...specialComponents,
};

export * from "./debug";
export * from "./form";
export * from "./html";
export * from "./special";
