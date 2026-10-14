# Changelog

Notable changes of `@ea-lab/reactive-json`. Earlier versions are described in the git history.

## Unreleased (proposed: 2.10.0)

Option-based components (`CheckBoxField`, `SelectField`, `LabelFromValue`) can be fed by data-driven lists.

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
- Warnings (logged once):
  - `CheckBoxField`, when single-value checkbox fields with different values share the same data location (they check and uncheck together);
  - `Html`, when a checkbox or radio `input` has event reactions but neither a `checked` attribute nor an attribute transform on `checked` (it always stays unchecked). The rendering is unchanged.

### Changed

- **The option `value` is evaluated like the option `label`** in `CheckBoxField`, `SelectField` and `LabelFromValue`: `value: ~.id` stores the item's `id` instead of the `"~.id"` string. In a `Switch` item template, each field now gets its own value.
- **`CheckBoxField` stores a list when the bound data is an array**: `multiple` now defaults to `true` when the data is an array or when there is more than one option (previously: only when there was more than one option). One single-option field per `Switch` item, all bound to the same array, now checks independently and stores `["20 octobre", ...]`.
- `CheckBoxField`: an `id` given in `labelAttributes` is only applied to the field label, no longer duplicated on every option label. The other `labelAttributes` still apply to both.

### Fixed

- `CheckBoxField` no longer crashes ("Rendered more hooks than during the previous render") when its `dynamicOptions` go from an empty list to a filled one.
- Pagination (`usePagination`, used by a paginated `Switch`): the displayed page is capped to the last page of the current content. A paginated list that shrinks (e.g. filtered while on page 3) no longer shows an empty page without page buttons. The chosen page is remembered: when the content grows back, the list returns to it.
- `ReactiveJsonSubroot` with `sharedUpdates`: typing in a controlled field (`TextField`, `TextAreaField`...) bound to shared data no longer moves the caret to the end of the field. An update sent to the parent is now also applied to the subroot's own data right away, instead of waiting for the parent to send it back through `dataOverride`.

### Migration notes

- Only literal option values that are template references change meaning: `~`, `~~`, and the strings starting with `~.`, `~~.`, `~>` or `~~>`. Such a value is now replaced by the referenced data. A literal value of that form must be moved to the data and referenced.
- A single-option `CheckBoxField` bound to data that is already an array now adds / removes its value in that array, instead of replacing the array with the value / `false`. Set `multiple: false` to keep the previous behavior.
- The `Html` behavior is unchanged: a raw checkbox or radio still needs a `checked` binding (`checked: ~.isSelected`, or an `attributeTransforms` entry on `checked`).
