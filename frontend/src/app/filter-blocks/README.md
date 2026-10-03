# filter-blocks

Reusable filter editor for the backend's filter language (`AnyFilter[]` from `@common/types`): tag chips for quick filtering plus "advanced" filter blocks combined with AND, and OR groups (`ConcatenationFilter`). Used by `view-datasets`, `browse-journey` and the journey editor.

## Files

| File / folder               | Purpose                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `filter-blocks.module.ts`   | Declares the three components; exports `FilterBlocksComponent`. Imports `MapModule` for the map filter dialog. |
| `filter-blocks.component.*` | `<app-filter-blocks>` (this README).                                                                           |
| `filter-block/`             | One editable filter (key, negation, operation, value).                                                         |
| `edit-map-filter-dialog/`   | Dialog to draw a RADIUS/AREA filter on the map.                                                                |

## `<app-filter-blocks>` API

|           | Name              | Type               | Meaning                                                                                 |
| --------- | ----------------- | ------------------ | --------------------------------------------------------------------------------------- |
| `@Input`  | `filterSet`       | `AnyFilter[]`      | Filters to edit. The array is **mutated in place** (the journey editor relies on this). |
| `@Input`  | `dropdownOptions` | `DropdownOption[]` | Optional list of allowed keys; renders a select instead of a free-text key.             |
| `@Output` | `onSearch`        | `AnyFilter[]`      | "Apply filters" clicked.                                                                |
| `@Output` | `onChange`        | `void`             | Any change (used by the journey to refresh map filters).                                |

Logic: a tag is a non-negated `CONTAINS` filter on `tags`; `hasAdvancedFilters$` is true when other filters than tags and positive `content.location` map filters exist. `addConcatenationFilter` turns a filter into an OR group, `removeConcatenationFilter` collapses a group of two back into a single filter.

## Gotchas

- Output names start with `on` (lint warning `no-output-on-prefix`); renaming them would change all templates using the component.
- Type guards live in `src/util/filter-utils.ts`.
