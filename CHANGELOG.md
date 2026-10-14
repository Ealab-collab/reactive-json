# Changelog

Notable changes of `@ea-lab/reactive-json`. Earlier versions are described in the git history.

## 2.10.0 (2026-10-14)

Option-based components (`CheckBoxField`, `SelectField`, `LabelFromValue`) can be fed by data-driven lists. Strings and URLs can be composed from data, and new reactions cover common list and serialization needs. Paginated lists that shrink and typing in shared subroot fields are fixed.

### Added

- `optionMapping` on `CheckBoxField`, `SelectField` and `LabelFromValue`: builds each option from an item of the options list. The mapping is evaluated once per item, with the item as the template context (`~.title`, `~`), and its keys override the item's keys. The options can thus come from a list of any shape:

  ```yaml
  - type: CheckBoxField
    dataLocation: ~~.lead.sessions
    dynamicOptions: ~~.sessions # [{label: "20 octobre"}, ...]
    optionMapping:
      label: ~.label
      value: ~.label
  ```

- Scalar items in `options` / `dynamicOptions` (`["red", "green"]`): each scalar is used as both label and value. They previously produced options without a value.
- `evaluateFieldOptions()` utility (exported), for custom components reading `options` / `dynamicOptions` / `optionMapping`.
- `CheckBoxField` accessibility: when a field `label` names several options, the element containing them gets `role="group"` and `aria-labelledby` pointing to the field label. A field `label` with a single option without its own label is associated with the input. The radios of a field share a `name`, which forms a native radio group (one tab stop, arrow keys).
- URLs and strings composed from segments, in the format of `additionalDataSource.src` (literal strings, template references, `{segment, required}`, `{param, value, required}`):
  - `url` of `fetchData` and `submitData`: no request is sent when a required segment is empty;
  - `to` of `redirectNow`: no navigation when a required segment is empty;
  - URL attributes (`href`, `src`, `action`, `formAction`, `poster`) of any element: the attribute is omitted when a required segment is empty;
  - new `joinData` reaction (`path`, `parts`): writes the composed string in the data.

  The references are evaluated in the current template context (`~.slug` reads the current `Switch` item), unlike `additionalDataSource.src`, which reads the root data only. `interpolateSegmentsInContext()` is exported for custom components.

  ```yaml
  - type: a
    attributes:
      href: ["/article/", ~.year, "/", { segment: ~.slug, required: true }]
  ```

- `redirectNow`: `replace: true` replaces the current history entry instead of adding one.
- `setClipboardData`: `statusPath` receives `"copied"` or `"failed"` once the copy is done. Outside a secure context (plain http), where the clipboard API is missing, the copy falls back to the `copy` command.
- New reactions:
  - `toggleData` (`path`, `value`): adds the value to the array when absent, removes it when present, keeps the other values. A missing or non-array location counts as empty; values are compared as strings; an empty value does nothing.
  - `collectField` (`from`, `field`, `path`): writes the field of every item of a collection as an array (e.g. "select all"). Non-object items and empty fields are skipped.
  - `stringifyData` (`from`, `path`): writes `JSON.stringify` of a value, synchronously in the actions list (e.g. before a `submitData`).
  - `printPage`: opens the print dialog of the browser.
- Warnings (logged once):
  - `CheckBoxField`, when single-value checkbox fields with different values share the same data location (they check and uncheck together);
  - `Html`, when a checkbox or radio `input` has event reactions but neither a `checked` attribute nor an attribute transform on `checked` (it always stays unchecked). The rendering is unchanged.

### Changed

- **The option `value` is evaluated like the option `label`** in `CheckBoxField`, `SelectField` and `LabelFromValue`: `value: ~.id` stores the item's `id` instead of the `"~.id"` string. In a `Switch` item template, each field now gets its own value.
- **`CheckBoxField` stores a list when the bound data is an array**: `multiple` now defaults to `true` when the data is an array or when there is more than one option (previously: only when there was more than one option). One single-option field per `Switch` item, all bound to the same array, now checks independently and stores `["20 octobre", ...]`.
- `CheckBoxField`: an `id` given in `labelAttributes` is only applied to the field label, no longer duplicated on every option label. The other `labelAttributes` still apply to both.
- `setClipboardData` also copies numbers, and does nothing when the value is empty.
- `redirectNow` no longer navigates when its URL evaluates to an empty value (it used to navigate to `undefined`).

### Fixed

- `CheckBoxField` no longer crashes ("Rendered more hooks than during the previous render") when its `dynamicOptions` go from an empty list to a filled one.
- Pagination (`usePagination`, used by a paginated `Switch`): the displayed page is capped to the last page of the current content. A paginated list that shrinks (e.g. filtered while on page 3) no longer shows an empty page without page buttons. The chosen page is remembered: when the content grows back, the list returns to it.
- `ReactiveJsonSubroot` with `sharedUpdates`: typing in a controlled field (`TextField`, `TextAreaField`...) bound to shared data no longer moves the caret to the end of the field. An update sent to the parent is now also applied to the subroot's own data right away, instead of waiting for the parent to send it back through `dataOverride`.
- `interpolateSegments` (`additionalDataSource.src`, `AutocompleteField.src`): a `{param}` segment added to a path that already has a query string continues it with `&` instead of adding a second `?`.

### Migration notes

Existing RjBuilds need no change to upgrade. The following cases, rare in practice, behave differently:

- Only literal option values that are template references change meaning: `~`, `~~`, and the strings starting with `~.`, `~~.`, `~>` or `~~>`. Such a value is now replaced by the referenced data. A literal value of that form must be moved to the data and referenced.
- A single-option `CheckBoxField` bound to data that is already an array now adds / removes its value in that array, instead of replacing the array with the value / `false`. Set `multiple: false` to keep the previous behavior.
- The `Html` behavior is unchanged: a raw checkbox or radio still needs a `checked` binding (`checked: ~.isSelected`, or an `attributeTransforms` entry on `checked`).
- New core reactions (`toggleData`, `collectField`, `joinData`, `stringifyData`, `printPage`): an application that registers its own reaction under one of these names keeps its own version, since the application plugins are merged after the core ones. Remove the local version to use the core one; check the argument names first (the destination is `path`, the source is `from`).
- In the segments of `url`, `to`, URL attributes and `joinData`, an empty reference that is not required produces an empty part (as in `additionalDataSource.src`). Mark as `required: true` every part whose absence would change the meaning of the URL, such as an entity id: `["/api/save", { param: "id", value: ~.nid, required: true }]`.
- A `{param}` segment added to a path that already holds a query string now continues it with `&`: URLs that used to contain two `?` change, and become valid.
