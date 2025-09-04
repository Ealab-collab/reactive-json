// ————————————————————————————————————————————————————————————————
// Data-location (~ / ~~) grammar
// ————————————————————————————————————————————————————————————————
export const DATA_LOCATION_ANY              = /^~{1,2}[>.].+$/;
export const TEMPLATE_CONTEXT_REFERENCE_PATTERN  = /^~\.(?<key>.+)$/;
export const GLOBAL_CONTEXT_REFERENCE_PATTERN    = /^~~\.(?<key>.+)$/;
export const TEMPLATE_PATH_REFERENCE_PATTERN     = /^~>.(?<key>.+)$/;
export const GLOBAL_PATH_REFERENCE_PATTERN       = /^~~>.(?<key>.+)$/;


// Presence checks
export const isDataLocationPattern = (v) => DATA_LOCATION_ANY.test(v);
export const isTemplateContextReference = (v) => TEMPLATE_CONTEXT_REFERENCE_PATTERN.test(v);
export const isGlobalContextReference   = (v) => GLOBAL_CONTEXT_REFERENCE_PATTERN.test(v);
export const isTemplatePathReference    = (v) => TEMPLATE_PATH_REFERENCE_PATTERN.test(v);
export const isGlobalPathReference      = (v) => GLOBAL_PATH_REFERENCE_PATTERN.test(v);

// Getters (key extraction)
export const getTemplateContextReferenceKey = (v) => TEMPLATE_CONTEXT_REFERENCE_PATTERN.exec(v)?.groups?.key;
export const getGlobalContextReferenceKey = (v) => GLOBAL_CONTEXT_REFERENCE_PATTERN.exec(v)?.groups?.key;
export const getTemplatePathReferenceKey = (v) => TEMPLATE_PATH_REFERENCE_PATTERN.exec(v)?.groups?.key;
export const getGlobalPathReferenceKey = (v) => GLOBAL_PATH_REFERENCE_PATTERN.exec(v)?.groups?.key;
