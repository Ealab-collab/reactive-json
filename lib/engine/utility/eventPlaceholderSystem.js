// ---------------------------------------------------------------------------
//  Event placeholders reference system
// ---------------------------------------------------------------------------
//  1)  <reactive-json:event-new-value>
//      Returns the « new value » of a standard form event.
//      Priority :
//          a) event.target.checked
//          b) event.target.value
//          c) undefined if not applicable
//      → Prefer for change/input on TextField, CheckBoxField, SelectField, etc.
//
//  2)  <reactive-json:event>.some.path
//      Explicit access to any property of the event object:
//          • .data.*   for MessageEvent
//          • .detail.* for CustomEvent
//          • .key      for KeyboardEvent, etc.
//      If no path is provided (empty placeholder), return undefined
//      to avoid injecting the Event object into the data store.
// ---------------------------------------------------------------------------

const EVENT_PLACEHOLDER_PREFIX = "<reactive-json:event>";
const EVENT_NEW_VALUE_PLACEHOLDER = "<reactive-json:event-new-value>";

/**
 * Derive the most relevant "new value" from the event.
 * @param {*} event The event to inspect.
 * @returns {*} The new value.
 */
const extractEventNewValue = (event) => {
    if (!event) return undefined;

    if (event instanceof CustomEvent) {
        // We use the detail.value property of CustomEvent objects.
        // For example, for the response event fired by fetchData (in httpRequestCommon.jsx),
        // we can use either:
        // - <reactive-json:event>.detail.value.myValue
        // - <reactive-json:event-new-value>.myValue
        return event?.detail?.value;
    }

    if (event.target) {
        // Priority: derive the most relevant "new value" depending on the field type.
        const t = event.target;

        if (t.type === "checkbox") {
            // Special case: checkbox → return the boolean "checked".
            return t.checked;
        }

        if (t.type === "radio") {
            // Special case: radio → return the value only if selected.
            return t.checked ? t.value : undefined;
        }

        if (typeof t.value !== "undefined") {
            // Text field / number / select, etc. → return the value.
            return t.value;
        }

        if (typeof t.checked !== "undefined") {
            // Fallback: return checked if it exists.
            return t.checked;
        }
    }

    // No applicable property found.
    return undefined;
};

/**
 * Resolves a placeholder string against the event object.
 *
 * @param {*} value The value to inspect. If it's a string beginning with the placeholder prefix, it will be replaced.
 * @param {Event} event The DOM or custom event object that triggered the action.
 * @returns {*} The original value or the resolved value extracted from the event.
 */
const evaluateEventPlaceholder = (value, event) => {
    if (typeof value !== "string") {
        return value;
    }

    // Determine the placeholder that was used.
    let usedPlaceholder = undefined;

    if (value.startsWith(EVENT_NEW_VALUE_PLACEHOLDER)) {
        usedPlaceholder = EVENT_NEW_VALUE_PLACEHOLDER;
    }

    if (value.startsWith(EVENT_PLACEHOLDER_PREFIX)) {
        usedPlaceholder = EVENT_PLACEHOLDER_PREFIX;
    }

    if (!usedPlaceholder) {
        // Not using a placeholder.
        return value;
    }

    // The base object to extract the value from.
    let baseObject = undefined;

    // An optional path after the placeholder.
    let path = undefined;

    if (usedPlaceholder === EVENT_NEW_VALUE_PLACEHOLDER) {
        baseObject = extractEventNewValue(event);
        path = value.slice(EVENT_NEW_VALUE_PLACEHOLDER.length);
    }

    if (usedPlaceholder === EVENT_PLACEHOLDER_PREFIX) {
        baseObject = event;
        path = value.slice(EVENT_PLACEHOLDER_PREFIX.length);
    }

    // Remove an optional leading dot.
    if (path.startsWith(".")) {
        path = path.slice(1);
    }

    if (!path) {
        // No path provided.
        if (usedPlaceholder === EVENT_PLACEHOLDER_PREFIX) {
            // For security, we don't return the raw event
            // object to avoid storing it in the data.
            return undefined;
        }

        // Return the object itself.
        return baseObject;
    }

    // There is a path, so we want to extract a value from the object.
    if (typeof baseObject !== "object" || !baseObject) {
        // Not an object or not defined, so there is no need to continue.
        // This is an unexpected case, so we at least return undefined.
        return undefined;
    }

    return path.split(".").reduce((current, key) => (current ? current[key] : undefined), baseObject);
};

/**
 * Recursively scans an object/array/string to replace any event placeholder it may contain.
 *
 * @param {*} source The source value (object, array, or primitive).
 * @param {Event} event The event to read values from.
 * @returns {*} A new structure with placeholders resolved.
 */
export const replaceEventPlaceholders = (source, event) => {
    if (Array.isArray(source)) {
        return source.map((item) => replaceEventPlaceholders(item, event));
    }

    if (source && typeof source === "object") {
        const replaced = {};
        for (const [key, val] of Object.entries(source)) {
            replaced[key] = replaceEventPlaceholders(val, event);
        }
        return replaced;
    }

    // Primitive values (string/number/etc.)
    return evaluateEventPlaceholder(source, event);
};
