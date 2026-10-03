# journey/collection

`<app-collection>`: expansion panel for one collection in the journey editor.

| Input (required) | Type                                                         |
| ---------------- | ------------------------------------------------------------ |
| `collection`     | `Collection`                                                 |
| `dataFiles`      | `PaginationResult<Datafile>`                                 |
| `color`          | hex colour of the collection (header background, map points) |

- Header checkbox (de)selects all files (`JourneyService.selectDataFiles/deselectDataFiles`), shows indeterminate state when only some are selected.
- Edit button renames the collection via `InputDialogComponent`, then `JourneyService.triggerCollectionChange()`.
- "Show filters" selects the collection (its filters appear in the filter blocks and on the map); the selected collection auto-expands.
- Delete removes it from the journey.
- Lists files with `<app-data-file-list-entry>`.
