# browse-journey

`BrowseJourneyComponent` (route `/browse-journeys`, declared in `AppModule`): paged Material table of all journeys with title, description, tags and author, plus actions per row.

Original author: Florian Jäger (Browse Journeys page, PR #164).

## Behaviour

- `ngOnInit` loads the first page via `ApiService.getJourneys(limit, skip)`; with filters from `<app-filter-blocks>` it uses `ApiService.filterJourneys({ filterSet }, limit, skip)` instead (only for non-empty filter sets).
- The filter key is chosen from a dropdown (`dropdownOptions`: title, description, tags, author).
- Row actions: continue the journey (`/journey/<id>`), download its data (`DownloadService.downloadJourney`, respects `excludedIDs`), delete (`ApiService.deleteJourney`, then reload + snack bar).
- `onPageChange` translates the paginator event into `limit`/`skip`.

Backend: `GET /api/journey/limit=…&skip=…`, `POST /api/journey/filter/limit=…&skip=…`, `DELETE /api/journey/:id`, plus `POST /api/datafile/filter/…` for downloads.

## Gotchas

- Data is loaded in `ngOnInit` (was `ngAfterViewInit`, which caused `ExpressionChangedAfterItHasBeenChecked` errors); the duplicate hard-coded English "Journey deleted" notification was removed.
- The paginator's `pageSize` is fixed to 10 in the template; changing it updates `limit` only on the next page event.
