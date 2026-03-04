import { useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ActionDependant } from "../../../engine/Actions.jsx";
import { GlobalDataContext } from "../../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../../engine/TemplateContext.jsx";
import { useEvaluatedAttributes } from "../../../engine/TemplateSystem.jsx";
import { propsDataLocationToPathAndValue } from "../../../engine/utility/formElementsCommon.jsx";
import { interpolateSegments } from "../../../engine/utility/interpolateSegments.js";
import { View } from "../../../engine/View.jsx";

/**
 * Token used inside `src` segments to reference the current search input value.
 *
 * Example:
 *   - param: "filter[0][v]"
 *     value: "<reactive-json:autocomplete-field:input>"
 */
const INPUT_TOKEN = "<reactive-json:autocomplete-field:input>";

const DEFAULT_ITEM_TEMPLATE = { type: "div", content: "~.label" };
const DEFAULT_SELECTED_TEMPLATE = { type: "span", content: "~.label" };

/**
 * Substitutes the INPUT_TOKEN with the current search text in `src` segment
 * descriptors, before passing them to interpolateSegments.
 */
const resolveTokenInSegments = (segments, searchText) => {
    if (typeof segments === "string") {
        return segments.replace(INPUT_TOKEN, searchText);
    }
    if (!Array.isArray(segments)) return segments;

    return segments.map((seg) => {
        if (typeof seg === "string") {
            return seg.replace(INPUT_TOKEN, searchText);
        }
        if (seg && typeof seg === "object") {
            const resolved = { ...seg };
            if (typeof resolved.segment === "string") {
                resolved.segment = resolved.segment.replace(INPUT_TOKEN, searchText);
            }
            if (typeof resolved.value === "string") {
                resolved.value = resolved.value.replace(INPUT_TOKEN, searchText);
            }
            if (typeof resolved.param === "string") {
                resolved.param = resolved.param.replace(INPUT_TOKEN, searchText);
            }
            return resolved;
        }
        return seg;
    });
};

/**
 * An autocomplete / typeahead form field.
 *
 * Fetches suggestions from a remote URL as the user types. The URL is built
 * using the same segment/param format as `additionalDataSource.src`, with the
 * special token `<reactive-json:autocomplete-field:input>` representing the
 * current search text.
 *
 * Supports both single-value and multiple-value selection modes.
 *
 * Props:
 *   dataLocation     — (required) where to store the selected value(s)
 *   src              — (required) URL segments (same format as additionalDataSource.src)
 *   placeholder      — input placeholder text
 *   minChars         — minimum chars before triggering search (default: 2)
 *   debounce         — debounce delay in ms (default: 300)
 *   multiple         — enable multiple selection mode (default: false)
 *   maxItems         — maximum number of selections in multiple mode (default: unlimited)
 *   clearOnSelect    — clear input and close dropdown after each pick (default: true)
 *   itemTemplate     — rjbuild template for each dropdown item (default: div with ~.label)
 *   selectedTemplate — rjbuild template for selected item / tag display (default: span with ~.label)
 *
 * Expected backend response:
 *   The endpoint must return a JSON array of objects, each with at minimum:
 *     [
 *       { "value": 42, "label": "Article title" },
 *       { "value": 7,  "label": "Another article" }
 *     ]
 *   Additional keys are allowed and can be used in `itemTemplate` / `selectedTemplate`
 *   via `~.fieldName`. With `decoupled_toolbox`, use the `decoupled_select_list_item`
 *   view mode to produce this structure automatically.
 *
 * YAML usage (single):
 *   - type: AutocompleteField
 *     dataLocation: ~~.selectedId
 *     placeholder: "Search…"
 *     src:
 *       - "/decoupled-api/node/article/collection"
 *       - param: "filter[0][f]"
 *         value: "title"
 *       - param: "filter[0][c]"
 *         value: "CONTAINS"
 *       - param: "filter[0][v]"
 *         value: "<reactive-json:autocomplete-field:input>"
 *       - param: "display"
 *         value: "decoupled_select_list_item"
 *       - param: "limit"
 *         value: "10"
 *
 * YAML usage (multiple):
 *   - type: AutocompleteField
 *     dataLocation: ~~.selectedIds
 *     multiple: true
 *     maxItems: 5
 *     clearOnSelect: true
 *     src: [...]
 */
export const AutocompleteField = ({ props, path, datafield }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const attributes = useEvaluatedAttributes(props.attributes);

    const [searchText, setSearchText] = useState("");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const debounceRef = useRef(null);
    const fetchCounterRef = useRef(0);
    const containerRef = useRef(null);

    const multiple = props.multiple === true;
    const maxItems = props.maxItems ?? null;
    const minChars = props.minChars ?? 2;
    const debounceMs = props.debounce ?? 300;
    const placeholder = props.placeholder ?? "";
    const clearOnSelect = props.clearOnSelect !== false;

    const itemTemplate = props.itemTemplate ?? DEFAULT_ITEM_TEMPLATE;
    const selectedTemplate = props.selectedTemplate ?? DEFAULT_SELECTED_TEMPLATE;

    const { formData, formDataPath } = propsDataLocationToPathAndValue({
        currentPath: path,
        datafield,
        dataLocation: props.dataLocation,
        defaultValue: multiple ? [] : null,
        globalDataContext,
        templateContext,
    });

    const selectedValues = Array.isArray(formData)
        ? formData
        : formData != null
            ? [formData]
            : [];

    const isMaxReached = multiple && maxItems !== null && selectedValues.length >= maxItems;

    const makeGetter = useCallback(() => {
        return (refPath) => {
            const parts = refPath.split(".");
            return parts.reduce(
                (node, part) => (node != null && typeof node === "object" ? node[part] : undefined),
                globalDataContext.templateData,
            );
        };
    }, [globalDataContext.templateData]);

    // --- Fetch ---
    const doFetch = useCallback(async (text) => {
        if (!props.src) return;

        const resolvedSegments = resolveTokenInSegments(props.src, text);
        const url = interpolateSegments(resolvedSegments, makeGetter());

        if (!url) return;

        fetchCounterRef.current += 1;
        const myFetch = fetchCounterRef.current;

        setIsLoading(true);
        try {
            const response = await axios.get(url);
            if (fetchCounterRef.current !== myFetch) return;

            const data = Array.isArray(response.data) ? response.data : [];
            setResults(data);
            setIsOpen(data.length > 0);
        }
        catch {
            if (fetchCounterRef.current !== myFetch) return;
            setResults([]);
            setIsOpen(false);
        }
        finally {
            if (fetchCounterRef.current === myFetch) setIsLoading(false);
        }
    }, [props.src, makeGetter]);

    // --- Input change ---
    const handleInputChange = useCallback((e) => {
        const text = e.target.value;
        setSearchText(text);

        clearTimeout(debounceRef.current);

        if (text.length < minChars) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        debounceRef.current = setTimeout(() => doFetch(text), debounceMs);
    }, [minChars, debounceMs, doFetch]);

    // --- Item click ---
    const handleItemClick = useCallback((item) => {
        if (multiple) {
            const idx = selectedValues.indexOf(item.value);
            if (idx >= 0) {
                const newValues = selectedValues.filter((v) => v !== item.value);
                globalDataContext.updateData(newValues, formDataPath);
                setSelectedItems((prev) => prev.filter((s) => s.value !== item.value));
            }
            else {
                if (maxItems !== null && selectedValues.length >= maxItems) return;
                globalDataContext.updateData([...selectedValues, item.value], formDataPath);
                setSelectedItems((prev) => [...prev, item]);
            }
            if (clearOnSelect) {
                setSearchText("");
                setIsOpen(false);
                setResults([]);
            }
        }
        else {
            globalDataContext.updateData(item.value, formDataPath);
            setSelectedItems([item]);
            setSearchText("");
            setIsOpen(false);
            setResults([]);
        }
    }, [multiple, selectedValues, formDataPath, globalDataContext, maxItems, clearOnSelect]);

    // --- Clear (single mode) ---
    const handleClear = useCallback(() => {
        globalDataContext.updateData(null, formDataPath);
        setSelectedItems([]);
        setSearchText("");
    }, [globalDataContext, formDataPath]);

    // --- Remove tag (multiple mode) ---
    const handleRemoveTag = useCallback((value) => {
        const newValues = selectedValues.filter((v) => v !== value);
        globalDataContext.updateData(newValues, formDataPath);
        setSelectedItems((prev) => prev.filter((s) => s.value !== value));
    }, [selectedValues, formDataPath, globalDataContext]);

    // --- Close dropdown on outside click ---
    useEffect(() => {
        const onOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", onOutsideClick);
        return () => document.removeEventListener("mousedown", onOutsideClick);
    }, []);

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    const hasSingleSelection = !multiple && selectedItems.length > 0;
    const { class: className, ...restAttrs } = attributes || {};

    return (
        <ActionDependant {...props}>
            <div
                ref={containerRef}
                className={["rj-autocomplete", className].filter(Boolean).join(" ")}
                {...restAttrs}
            >
                {/* Tags — multiple mode */}
                {multiple && selectedItems.map((item) => (
                    <span key={item.value} className="rj-autocomplete__tag">
                        <TemplateContext.Provider
                            value={{ templatePath: path + ".selected", templateData: item }}
                        >
                            <View
                                props={selectedTemplate}
                                path={path + ".selected"}
                                datafield="selected"
                            />
                        </TemplateContext.Provider>
                        <button
                            type="button"
                            className="rj-autocomplete__tag-remove"
                            onClick={() => handleRemoveTag(item.value)}
                            aria-label="Remove"
                        >
                            ×
                        </button>
                    </span>
                ))}

                {/* Search input */}
                {!hasSingleSelection && !isMaxReached && (
                    <input
                        type="text"
                        className="rj-autocomplete__input"
                        value={searchText}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        autoComplete="off"
                    />
                )}

                {/* Selected display — single mode */}
                {hasSingleSelection && (
                    <span className="rj-autocomplete__selected">
                        <TemplateContext.Provider
                            value={{ templatePath: path + ".selected", templateData: selectedItems[0] }}
                        >
                            <View
                                props={selectedTemplate}
                                path={path + ".selected"}
                                datafield="selected"
                            />
                        </TemplateContext.Provider>
                        <button
                            type="button"
                            className="rj-autocomplete__clear"
                            onClick={handleClear}
                            aria-label="Clear"
                        >
                            ×
                        </button>
                    </span>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <span className="rj-autocomplete__loading" aria-live="polite">…</span>
                )}

                {/* Dropdown */}
                {isOpen && results.length > 0 && (
                    <div className="rj-autocomplete__dropdown" role="listbox">
                        {results.map((item, index) => {
                            const isSelected = selectedValues.includes(item.value);
                            return (
                                <div
                                    key={item.value ?? index}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={[
                                        "rj-autocomplete__item",
                                        isSelected ? "is-selected" : "",
                                    ].filter(Boolean).join(" ")}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleItemClick(item);
                                    }}
                                >
                                    <TemplateContext.Provider
                                        value={{ templatePath: path + ".item", templateData: item }}
                                    >
                                        <View
                                            props={itemTemplate}
                                            path={path + ".item"}
                                            datafield="item"
                                        />
                                    </TemplateContext.Provider>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </ActionDependant>
    );
};
