/**
 * The markup security rules of the engine.
 *
 * A RjBuild and its data must never produce executable markup: a RjBuild can come from an
 * untrusted author (e.g. a page builder) and the data from anyone. React already drops the
 * string event handlers and blocks the javascript: URLs, but only for the attribute names
 * it knows in their React casing, and not on custom elements. These rules complete it,
 * whatever the casing, the element, or the way the attribute is set.
 *
 * There is no option in the RjBuild to lift them. A host application that needs more
 * registers its own element plugin.
 *
 * These rules cover the markup only. A RjBuild can still send requests (fetchData, submitData,
 * additionalDataSource...) with the session of the user: a host application rendering a RjBuild
 * it does not trust must restrict them itself.
 */

/**
 * The elements that are never rendered from a RjBuild.
 *
 * They run code (script), embed documents or plugins (object, embed, applet, frame, frameset),
 * rewrite every relative URL of the page (base), or hold raw text that the serialization of a
 * prerendered page writes as is (noembed, noframes, noscript, plaintext, xmp).
 *
 * @type {Set<string>}
 */
const refusedTagNames = new Set([
    "applet",
    "base",
    "embed",
    "frame",
    "frameset",
    "noembed",
    "noframes",
    "noscript",
    "object",
    "plaintext",
    "script",
    "xmp",
]);

/**
 * The elements whose text content is written as is when the page is serialized.
 *
 * They are rendered, but cannot wrap other elements.
 *
 * @type {Set<string>}
 */
const rawTextTagNames = new Set(["iframe", "style"]);

/**
 * The attributes holding a URL, normalized (lowercase, without "-" and ":").
 *
 * @type {Set<string>}
 */
const urlAttributeNames = new Set([
    "action",
    "background",
    "cite",
    "codebase",
    "data",
    "formaction",
    "href",
    "longdesc",
    "ping",
    "poster",
    "src",
    "xlinkhref",
]);

/**
 * The attributes that are never set from a RjBuild, normalized.
 *
 * srcdoc writes a document of the same origin as the page; dangerouslySetInnerHTML writes HTML.
 *
 * @type {Set<string>}
 */
const refusedAttributeNames = new Set(["dangerouslysetinnerhtml", "srcdoc"]);

/**
 * The attribute names (or tag names) already reported by a warning.
 *
 * @type {Set<string>}
 */
const reportedNames = new Set();

/**
 * Warns once per name.
 *
 * @param {string} name The refused attribute or element name.
 * @param {string} message The warning.
 */
const warnOnce = (name, message) => {
    if (reportedNames.has(name)) {
        return;
    }

    reportedNames.add(name);
    console.warn(message);
};

/**
 * Normalizes an attribute name to compare it: lowercase, without "-" and ":".
 *
 * "srcDoc", "SRCDOC" and "srcdoc" are the same attribute for the browser; so are
 * "xlinkHref" and "xlink:href", or "httpEquiv" and "http-equiv".
 *
 * @param {string} name The attribute name.
 *
 * @returns {string} The normalized name.
 */
const normalizeAttributeName = (name) => String(name).toLowerCase().replace(/[-:]/g, "");

/**
 * Converts a value to the string the browser would receive, or undefined when it can't.
 *
 * @param {*} value The attribute value.
 *
 * @returns {string|undefined}
 */
const toAttributeText = (value) => {
    if (value === null || value === undefined || typeof value === "function") {
        return undefined;
    }

    try {
        return String(value);
    } catch {
        // E.g. an object without prototype. React fails on it anyway.
        return undefined;
    }
};

/**
 * Normalizes a URL like the browser does before reading its scheme.
 *
 * The browser ignores the tabs and the line breaks anywhere in a URL,
 * and the controls and spaces before it.
 *
 * @param {string} url The URL.
 *
 * @returns {string} The URL without them, lowercase.
 */
const normalizeUrl = (url) =>
    url
        .replace(/[\t\n\r]/g, "")
        .replace(/^[\x00-\x20]+/, "")
        .toLowerCase();

/**
 * Tells if a URL runs code or opens an HTML document when the browser loads it.
 *
 * Refused: javascript: and vbscript: URLs, and data: URLs of an HTML document.
 * The other URLs (relative, http, mailto, tel, data: images...) are safe in an attribute.
 *
 * @param {string} url The URL.
 *
 * @returns {boolean} True when the URL must not reach an attribute.
 */
export const isUnsafeUrl = (url) => {
    if (typeof url !== "string") {
        return false;
    }

    const normalized = normalizeUrl(url);

    if (normalized.startsWith("javascript:") || normalized.startsWith("vbscript:")) {
        return true;
    }

    if (!normalized.startsWith("data:")) {
        return false;
    }

    const mediaType = normalized.slice("data:".length).split(/[;,]/)[0].trim();

    return mediaType === "text/html" || mediaType === "application/xhtml+xml";
};

/**
 * Tells if a URL can be navigated to: a relative URL, or an http(s) URL.
 *
 * Navigating to a javascript: URL runs it in the page. The other schemes
 * (mailto:, data:...) are not expected for a redirection either.
 *
 * @param {*} url The URL.
 *
 * @returns {boolean} True when the navigation is allowed.
 */
export const isSafeNavigationUrl = (url) => {
    let text;

    try {
        // The browser converts the value to a string when it navigates.
        text = String(url);
    } catch {
        return false;
    }

    const scheme = /^([a-z][a-z0-9+.-]*):/.exec(normalizeUrl(text));

    return !scheme || scheme[1] === "http" || scheme[1] === "https";
};

/**
 * Tells if an element can be rendered from a RjBuild.
 *
 * @param {string} tagName The tag name, in any case.
 *
 * @returns {boolean} False for the refused elements (script, object, base...).
 */
export const isAllowedTag = (tagName) => !refusedTagNames.has(String(tagName).toLowerCase());

/**
 * Tells if an element holds raw text (iframe, style).
 *
 * The serialization of a prerendered page writes their text as is: a text containing
 * their closing tag would end them and inject the markup that follows.
 *
 * @param {string} tagName The tag name, in any case.
 *
 * @returns {boolean}
 */
export const isRawTextTag = (tagName) => rawTextTagNames.has(String(tagName).toLowerCase());

/**
 * Makes a text safe to be the content of a style element.
 *
 * @param {string} css The style sheet.
 *
 * @returns {string} The style sheet, unable to close its element.
 */
export const escapeStyleText = (css) => String(css).replace(/<\/(style)/gi, "<\\/$1");

/**
 * Tells if an attribute can be set on an element.
 *
 * Refused:
 * - the event handlers (on...) whose value is not a function: a string becomes inline script.
 *   The functions (set by the engine or the host) are kept, as well as booleans and numbers,
 *   which may be props of a wrapped component;
 * - srcdoc and dangerouslySetInnerHTML;
 * - a URL attribute (href, src, action, formaction, xlink:href, data...) with an unsafe URL;
 * - an animation of a link target or an event handler (animate, set: attributeName);
 * - the http-equiv of a meta (a refresh redirects the page).
 *
 * The names are compared in any case: the browser lowercases the HTML attribute names.
 *
 * These are the rules of the HTML attributes. The props that a component interprets in its
 * own way (e.g. "as", which picks the rendered element) are checked by sanitizeComponentProps.
 *
 * @param {string} name The attribute name.
 * @param {*} value The attribute value.
 * @param {string} [tagName] The tag name, for the rules that depend on the element.
 *
 * @returns {boolean} True when the attribute can be set.
 */
export const isAllowedAttribute = (name, value, tagName) => {
    const key = String(name);

    if (/^on./i.test(key)) {
        return value === null || value === undefined || ["boolean", "function", "number"].includes(typeof value);
    }

    const normalizedName = normalizeAttributeName(key);

    if (refusedAttributeNames.has(normalizedName)) {
        return false;
    }

    if (urlAttributeNames.has(normalizedName)) {
        const text = toAttributeText(value);

        if (text !== undefined && isUnsafeUrl(text)) {
            return false;
        }
    }

    const normalizedTagName = tagName === undefined ? "" : String(tagName).toLowerCase();

    if ((normalizedTagName === "animate" || normalizedTagName === "set") && normalizedName === "attributename") {
        return !/^((xlink:)?href|on.*)$/i.test(String(toAttributeText(value) ?? "").trim());
    }

    if (normalizedTagName === "meta" && normalizedName === "httpequiv") {
        return false;
    }

    return true;
};

/**
 * Removes the attributes that must not be set (see isAllowedAttribute).
 *
 * @param {{}} attributes The attributes, as given to React.
 * @param {string} [tagName] The tag name, when known.
 *
 * @returns {{}} The same object when nothing is removed, a copy otherwise.
 */
export const sanitizeAttributes = (attributes, tagName) => {
    if (typeof attributes !== "object" || attributes === null) {
        return attributes;
    }

    let sanitized = attributes;

    for (const [name, value] of Object.entries(attributes)) {
        if (isAllowedAttribute(name, value, tagName)) {
            continue;
        }

        if (sanitized === attributes) {
            sanitized = { ...attributes };
        }

        delete sanitized[name];
        warnOnce(
            "attribute:" + normalizeAttributeName(name),
            `reactive-json: the "${name}" attribute is not set, because it could run code in the page.`
        );
    }

    return sanitized;
};

/**
 * Removes the props of a component that could run code, knowing the props it interprets.
 *
 * Core only knows the HTML attributes. A component can give a meaning of its own to a prop:
 * pick the element it renders (react-bootstrap "as", MUI "component"...), or hold the attributes
 * of an inner element (react-bootstrap Tabs "tabAttrs"...). Only the code wrapping the component
 * (a plugin, or the host application) knows them: it declares them in the policy, and the rules
 * of core apply to the element actually rendered.
 *
 * Policy:
 * - elementTypeProps: the props naming the rendered element, each with the tag rendered when the
 *   prop is not set (undefined when it is not a tag). A tag that is refused (script...) or holds
 *   raw text (style, iframe) is removed, so the component renders its default. The values that
 *   are not strings (e.g. a component set by the host) are kept.
 * - attributeProps: the props holding the attributes of an inner element, each with its own policy.
 *
 * The other props follow the rules of the HTML attributes (see isAllowedAttribute), including the
 * rules of the rendered element: the one named by the first element type prop, or its default.
 *
 * @example
 * // react-bootstrap Tab: the tab button is rendered "as" a button, with the attributes of "tabAttrs".
 * sanitizeComponentProps(tabProps, { attributeProps: { tabAttrs: { elementTypeProps: { as: "button" } } } });
 *
 * @param {{}} props The props, as given to the component.
 * @param {{elementTypeProps?: Object<string, string|undefined>, attributeProps?: Object<string, {}>}} [policy]
 *     The props that the component interprets.
 *
 * @returns {{}} The same object when nothing is removed, a copy otherwise.
 */
export const sanitizeComponentProps = (props, policy = {}) => {
    if (typeof props !== "object" || props === null) {
        return props;
    }

    const { elementTypeProps = {}, attributeProps = {} } = policy;
    let sanitized = props;

    const setProp = (name, value) => {
        if (sanitized === props) {
            sanitized = { ...props };
        }

        if (value === undefined) {
            delete sanitized[name];
        } else {
            sanitized[name] = value;
        }
    };

    for (const name of Object.keys(elementTypeProps)) {
        const value = props[name];

        if (typeof value === "string" && (!isAllowedTag(value) || isRawTextTag(value))) {
            warnRefusedTag(value);
            setProp(name, undefined);
        }
    }

    // The element-dependent rules need the rendered element: the one named by the first element type prop.
    let renderedTagName;
    const [mainElementTypeProp] = Object.entries(elementTypeProps);

    if (mainElementTypeProp) {
        const [name, defaultTagName] = mainElementTypeProp;
        const value = sanitized[name];

        if (value === undefined || value === null) {
            renderedTagName = defaultTagName;
        } else if (typeof value === "string") {
            renderedTagName = value;
        }
    }

    for (const [name, innerPolicy] of Object.entries(attributeProps)) {
        const value = sanitized[name];

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            const innerProps = sanitizeComponentProps(value, innerPolicy);

            if (innerProps !== value) {
                setProp(name, innerProps);
            }
        }
    }

    return sanitizeAttributes(sanitized, renderedTagName);
};

/**
 * Sets an attribute on a DOM element, unless it could run code (see isAllowedAttribute).
 *
 * For the actions that write the DOM directly, out of React.
 *
 * @param {Element} element The DOM element.
 * @param {string} name The attribute name.
 * @param {string} value The attribute value.
 *
 * @returns {boolean} True when the attribute has been set.
 */
export const setAttributeSafely = (element, name, value) => {
    if (!isAllowedAttribute(name, value, element.localName)) {
        warnOnce(
            "attribute:" + normalizeAttributeName(name),
            `reactive-json: the "${name}" attribute is not set, because it could run code in the page.`
        );
        return false;
    }

    element.setAttribute(name, value);
    return true;
};

/**
 * Warns that an element is not rendered.
 *
 * @param {string} tagName The refused tag name.
 */
export const warnRefusedTag = (tagName) => {
    warnOnce(
        "tag:" + String(tagName).toLowerCase(),
        `reactive-json: the <${tagName}> element is not rendered, because it could run code in the page.`
    );
};

/**
 * Warns that a navigation is refused.
 *
 * @param {string} caller The component or reaction that navigates.
 * @param {*} url The refused URL.
 */
export const warnRefusedNavigation = (caller, url) => {
    console.warn(
        `${caller}: the navigation to "${(toAttributeText(url) ?? "").slice(0, 64)}" is refused, ` +
            "only http(s) and relative URLs are allowed."
    );
};
