import { parseCookieSetTail } from "./cookiesPatternUtils";

import Cookies from 'universal-cookie';
const cookies = new Cookies(null, { path: '/' });

// ————————————————————————————————————————————————————————————————
// reactive-json mini-parser (single source of truth)
//    Supported forms (examples):
//      <reactive-json:env>.FOO                                                     // Get an environment variable
//      <reactive-json:localStorage>.key                                            // Get a local storage item
//      <reactive-json:sessionStorage>.key                                          // Get a session storage item
//      <reactive-json:url>                                                         // global URL
//      <reactive-json:url:path>                                                    // path
//      <reactive-json:url:queryParams>                                             // array of query params
//      <reactive-json:url:queryParam>.foo                                          // Get a query param
//      <reactive-json:cookies:get>.foo                                             // Get a cookie
//      <reactive-json:cookies:set>.foo=bar;option=option1;option2=option2...       // Set a cookie
//      <reactive-json:cookies:remove>.foo                                          // Remove a cookie
// ————————————————————————————————————————————————————————————————
export const REACTIVE_JSON_PLACEHOLDER_PATTERN =
  /^<reactive-json:(?<domain>env|localStorage|cookies(:get|:set|:remove)|sessionStorage|url(?::path|:queryParams|:queryParam)?)>(?<tail>.*)$/;

const COOKIES_VALUES_PATTERN = /^([^;]+)=([^;]+)(?:;([^;]*))?$/;

const PARSE_PLACEHOLDER_CACHE = new Map();

export const parseReactiveJsonPlaceholder = (value) => {
  if (PARSE_PLACEHOLDER_CACHE.has(value)) {
    const cached = PARSE_PLACEHOLDER_CACHE.get(value);
    return cached ? { ...cached } : null;
  }

  const m = REACTIVE_JSON_PLACEHOLDER_PATTERN.exec(value);
  if (!m || !m.groups) {
    PARSE_PLACEHOLDER_CACHE.set(value, null);
    return null;
  }

  const domain = m.groups.domain;        // e.g. 'url', 'url:path', 'env'
  const tail = m.groups.tail || '';      // may be '' (nothing after '>')

  const [root, section] = domain.split(':'); // root: 'env'|'localStorage'|'cookies'|'sessionStorage'|'url'

  const result = {
    domain,
    root,                                 // 'env' | 'localStorage' | 'cookies' | 'sessionStorage' | 'url'
    section,                              // undefined | 'path' | 'queryParams'
    tail,                                 // string after '>'
    hasDotPath: tail.startsWith('.'),     // whether tail is like ".foo"
  };
  PARSE_PLACEHOLDER_CACHE.set(value, result);
  return { ...result };
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

// Cookies
export const isCookiesPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return !!r && r.root === 'cookies';
};

export const isCookiesSetter = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return !!r && r.root === 'cookies' && r.section === 'set';
};

export const isCookiesGet = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return !!r && r.root === 'cookies' && r.section === 'get';
};

export const isCookiesRemove = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return !!r && r.root === 'cookies' && r.section === 'remove';
};

export const getCookiesNameFromPlaceholder = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  if (r.tail.startsWith('.')) {
    r.tail = r.tail.slice(1);
  }
  return r.tail;
};

export const getCookiesOptsObject = (v) => {
  const r = parseReactiveJsonPlaceholder(v);
  return parseCookieSetTail(r.tail);
};

export const manageCookies = (v) => {

  if (isCookiesSetter(v)) {
    const parsed = getCookiesOptsObject(v);
    if (!parsed) return null;

    const { name, value } = parsed;
    const opts = { path: '/', ...(parsed.options || {}) };

    // Enforce browser rules: SameSite=None must be Secure on modern browsers
    if (opts.sameSite === 'None') {
      if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
        opts.secure = true;
      } else {
        // Fallback for http: use Lax to allow setting in local dev
        // TODO: add the "dev" mode management
        opts.sameSite = 'Lax';
      }
    }
    cookies.set(name, value, opts);
    return value;
  }

  if (isCookiesGet(v)) {
    const name = getCookiesNameFromPlaceholder(v);
    return cookies.get(name);
  }

  if (isCookiesRemove(v)) {
    const name = getCookiesNameFromPlaceholder(v);
    cookies.remove(name, { path: '/' });
    return true;
  }

  return undefined;
};
