// ————————————————————————————————————————————————————————————————
// reactive-json mini-parser (single source of truth)
//    Supported forms (examples):
//      <reactive-json:env>.FOO
//      <reactive-json:localStorage>.key        // Get a local storage item
//      <reactive-json:sessionStorage>.key      // Get a session storage item
//      <reactive-json:url>                     // global URL
//      <reactive-json:url:path>                // path
//      <reactive-json:url:queryParams>         // array of query params
//      <reactive-json:url:queryParam>.foo      // Get a query param
// ————————————————————————————————————————————————————————————————
export const REACTIVE_JSON_PLACEHOLDER_PATTERN =
  /^<reactive-json:(?<domain>env|localStorage|sessionStorage|url(?::path|:queryParams|:queryParam)?)>(?<tail>.*)$/;

export const parseReactiveJsonPlaceholder = (value) => {
  const m = REACTIVE_JSON_PLACEHOLDER_PATTERN.exec(value);
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
export const isReactiveJsonPlaceholderPattern = (v) => !!parseReactiveJsonPlaceholder(v);

export const getReactiveJsonPlaceholderKey = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return r.tail;
};


// ENV
export const isGetEnvironmentVariablePlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  // env requires a dotted path, no op
  return !!r && r.root === 'env' && r.hasDotPath;
};

export const getEnvironmentVariableFromPlaceholder = (v) => {
  let key = getReactiveJsonPlaceholderKey(v);
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
export const isGetLocalAndSessionStoragePlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return !!r && (r.root === 'localStorage' || r.root === 'sessionStorage');
};

export const isGetLocalStoragePlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  // requires op (get/set/remove) + dotted key
  return (
    !!r &&
    r.root === 'localStorage'
  );
};

export const isGetSessionStoragePlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return !!r && r.root === 'sessionStorage';
};

export const getLocalStorageValueFromPlaceholder = (v) => {
  let key = getReactiveJsonPlaceholderKey(v);
  if (key.startsWith('.')) {
    key = key.slice(1);
  }
  return localStorage.getItem(key);
};

export const getSessionStorageValueFromPlaceholder = (v) => {
  let key = getReactiveJsonPlaceholderKey(v);
  if (key.startsWith('.')) {
    key = key.slice(1);
  }
  return sessionStorage.getItem(key);
};


// URL family
export const isUrlPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return !!r && r.root === 'url';
};

export const isGetGlobalUrlPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  // must be <reactive-json:url> with nothing after '>'
  return !!r && r.root === 'url' && !r.section && r.tail === '';
};

export const isGetUrlPathPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  // must be <reactive-json:url:path> with nothing after '>'
  return !!r && r.root === 'url' && r.section === 'path' && r.tail === '';
};

export const isGetUrlQueryParamsPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  // must be <reactive-json:url:queryParams> with nothing after '>'
  return !!r && r.root === 'url' && r.section === 'queryParams' && r.tail === '';
};

export const isGetUrlQueryParamPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
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

export const getUrlQueryParamFromPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  if (r.tail.startsWith('.')) {
    r.tail = r.tail.slice(1);
  }
  return window.location.search.split('?')[1]?.split('&').find(param => param.split('=')[0] === r.tail)?.split('=')[1];
};
