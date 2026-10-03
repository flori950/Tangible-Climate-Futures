# filter-blocks/edit-map-filter-dialog

`EditMapFilterDialogComponent`: `MatDialog` content showing `<app-map>` with the current RADIUS/AREA filter preset.

- Dialog data (`MAT_DIALOG_DATA`): the `RadiusFilter | AreaFilter` to edit; the component works on a deep copy.
- `onNewFilter(filters)` keeps the last filter drawn on the map (`null` if all were removed).
- `confirm()` closes with the edited filter (disabled while none exists), `cancel()` closes without result.
- Opened by `FilterBlockComponent.editMapFilter()`, which copies `operation` and `value` back into the original filter.
