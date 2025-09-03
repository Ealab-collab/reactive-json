// ————————————————————————————————————————————————————————————————
// 1) Data-location (~ / ~~) grammar
// ————————————————————————————————————————————————————————————————
export const DATA_LOCATION_ANY              = /^~{1,2}[>.].+$/;
export const TEMPLATE_CONTEXT_REFERENCE_RX  = /^~\.(?<key>.+)$/;
export const GLOBAL_CONTEXT_REFERENCE_RX    = /^~~\.(?<key>.+)$/;
export const TEMPLATE_PATH_REFERENCE_RX     = /^~>.(?<key>.+)$/;
export const GLOBAL_PATH_REFERENCE_RX       = /^~~>.(?<key>.+)$/;

export const isDataLocation = (v) => DATA_LOCATION_ANY.test(v);
export const isTemplateContextReference = (v) => TEMPLATE_CONTEXT_REFERENCE_RX.test(v);
export const isGlobalContextReference   = (v) => GLOBAL_CONTEXT_REFERENCE_RX.test(v);
export const isTemplatePathReference    = (v) => TEMPLATE_PATH_REFERENCE_RX.test(v);
export const isGlobalPathReference      = (v) => GLOBAL_PATH_REFERENCE_RX.test(v);
export const getTemplateContextReferenceKey = (v) => TEMPLATE_CONTEXT_REFERENCE_RX.exec(v)?.groups?.key;
export const getGlobalContextReferenceKey = (v) => GLOBAL_CONTEXT_REFERENCE_RX.exec(v)?.groups?.key;
export const getTemplatePathReferenceKey = (v) => TEMPLATE_PATH_REFERENCE_RX.exec(v)?.groups?.key;
export const getGlobalPathReferenceKey = (v) => GLOBAL_PATH_REFERENCE_RX.exec(v)?.groups?.key;

// ————————————————————————————————————————————————————————————————
// 2) reactive-json mini-parser (single source of truth)
//    Supported forms (examples):
//      <reactive-json:env>.FOO
//      <reactive-json:localStorage>.key        // Get a local storage item
//      <reactive-json:sessionStorage>.key      // Get a session storage item
//      <reactive-json:url>                     // global URL
//      <reactive-json:url:path>                // path
//      <reactive-json:url:queryParams>         // array of query params
//      <reactive-json:url:queryParam>.foo      // Get a query param
// ————————————————————————————————————————————————————————————————
export const REACTIVE_JSON_RX =
  /^<reactive-json:(?<domain>env|localStorage|sessionStorage|url(?::path|:queryParams|:queryParam)?)>(?<tail>.*)$/;

export const parseReactiveJson = (value) => {
  const m = REACTIVE_JSON_RX.exec(value);
  if (!m || !m.groups) return null;

  const domain = m.groups.domain;        // e.g. 'url', 'url:path', 'env'
  const tail = m.groups.tail || '';      // may be '' (nothing after '>')

  const [root, section] = domain.split(':'); // root: 'env'|'localStorage'|'sessionStorage'|'url'

  return {
    domain,
    root,                                 // 'env' | 'localStorage' | 'sessionStorage' | 'url'
    section,                              // undefined | 'path' | 'queryParams'
    tail,                                 // string after '>'
    hasDotPath: tail.startsWith('.'),     // whether tail is like ".foo"
  };
};

// Presence check
export const isReactiveJsonReactFeature = (v) => !!parseReactiveJson(v);

export const getReactiveJsonReactFeatureKey = (v) => {
  const r = parseReactiveJson(v);
  return r.tail;
};


// ENV
export const isGetEnvironmentVariableReactFeature = (v) => {
  const r = parseReactiveJson(v);
  // env requires a dotted path, no op
  return !!r && r.root === 'env' && r.hasDotPath;
};

export const getEnvironmentVariable = (v) => {
  let key = getReactiveJsonReactFeatureKey(v);
  if (key.startsWith('.')) {
    key = key.slice(1);
  }
  if (!key.startsWith('VITE_')) {
    console.error('Environment variable must start with VITE_:', key);
    console.info('Adding VITE_ prefix to:', key);
    key = 'VITE_' + key;
  }
  return import.meta.env[key];
};


// localStorage / sessionStorage
export const isGetLocalAndSessionStorageFeature = (v) => {
  const r = parseReactiveJson(v);
  return !!r && (r.root === 'localStorage' || r.root === 'sessionStorage');
};

export const isGetLocalStorageFeature = (v) => {
  const r = parseReactiveJson(v);
  // requires op (get/set/remove) + dotted key
  return (
    !!r &&
    r.root === 'localStorage'
  );
};

export const isGetSessionStorageFeature = (v) => {
  const r = parseReactiveJson(v);
  return !!r && r.root === 'sessionStorage';
};

export const getLocalStorageValue = (v) => {
  let key = getReactiveJsonReactFeatureKey(v);
  if (key.startsWith('.')) {
    key = key.slice(1);
  }
  return localStorage.getItem(key);
};

export const getSessionStorageValue = (v) => {
  let key = getReactiveJsonReactFeatureKey(v);
  if (key.startsWith('.')) {
    key = key.slice(1);
  }
  return sessionStorage.getItem(key);
};


// URL family
export const isUrlFeature = (v) => {
  const r = parseReactiveJson(v);
  return !!r && r.root === 'url';
};

export const isGetGlobalUrlFeature = (v) => {
  const r = parseReactiveJson(v);
  // must be <reactive-json:url> with nothing after '>'
  return !!r && r.root === 'url' && !r.section && r.tail === '';
};

export const isGetUrlPathFeature = (v) => {
  const r = parseReactiveJson(v);
  // must be <reactive-json:url:path> with nothing after '>'
  return !!r && r.root === 'url' && r.section === 'path' && r.tail === '';
};

export const isGetUrlQueryParamsFeature = (v) => {
  const r = parseReactiveJson(v);
  // must be <reactive-json:url:queryParams> with nothing after '>'
  return !!r && r.root === 'url' && r.section === 'queryParams' && r.tail === '';
};

export const isGetUrlQueryParamFeature = (v) => {
  const r = parseReactiveJson(v);
  return !!r && r.root === 'url' && r.section === 'queryParam';
};

export const getGlobalUrl = () => {
  return window.location.href;
};

export const getUrlPath = () => {
  return window.location.pathname;
};

export const getUrlQueryParams = () => {
  return window.location.search;
};

export const getUrlQueryParam = (v) => {
  const r = parseReactiveJson(v);
  if (r.tail.startsWith('.')) {
    r.tail = r.tail.slice(1);
  }
  return window.location.search.split('?')[1].split('&').find(param => param.split('=')[0] === r.tail)?.split('=')[1];
};
