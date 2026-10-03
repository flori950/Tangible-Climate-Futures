# filter-blocks/filter-block

`<app-filter-block>`: editor for a single `Filter` (key, negate toggle, operation, value).

|                     | Name              | Type               | Meaning                                       |
| ------------------- | ----------------- | ------------------ | --------------------------------------------- |
| `@Input` (required) | `filter`          | `Filter`           | Edited in place.                              |
| `@Input`            | `dropdownOptions` | `DropdownOption[]` | Key select instead of text input.             |
| `@Output`           | `onChange`        | `void`             | Emitted after operation/negation/map changes. |

- Changing the operation resets the value to a default (RADIUS: Berlin centre, 10 km; AREA: no vertices; strings `''`; numbers `0`; booleans `true`).
- Key and value inputs are reactive `FormControl`s synchronised with the filter (`ngOnChanges` → control, `valueChanges` → filter). Number filters store numbers.
- RADIUS/AREA filters are edited in `EditMapFilterDialogComponent` (`MatDialog`).

Gotchas: earlier versions bound `[(ngModel)]` and `[formControl]` to the same input, which caused `ExpressionChangedAfterItHasBeenChecked` errors; the boolean select listened to a non-existent `(change)` event (now `(selectionChange)`).
