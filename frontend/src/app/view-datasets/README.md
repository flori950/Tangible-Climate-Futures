# view-datasets

`ViewDatasetsComponent` (`/data-sets`, declared in `AppModule`): paged table of all data files (title, description, tags, data type, truncated content preview) with `<app-filter-blocks>` (free-text keys).

- `ngOnInit` loads `ApiService.getDatafiles(limit, skip, onlyMetadata=true)`; with filters `ApiService.filterDatafiles({ filterSet }, limit, skip, true)`.
- Row actions: edit (`/data-sets/<id>` → `NoFileUploadComponent`), download the row as JSON, delete (`DELETE /api/datafile/:id`, then reload). "Download all" saves the current page.
- `getContentAsString()` truncates the JSON preview after 75 characters.

Gotchas: because of `onlyMetadata=true` the downloaded JSON contains the metadata returned by the list endpoint, not necessarily the full content. Data is loaded in `ngOnInit` (was `ngAfterViewInit`).
