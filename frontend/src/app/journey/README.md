# journey

Journey editor (`/journey` for a new journey, `/journey/:id` to continue one; lazy-loaded `JourneyModule`). A journey consists of **collections**, each a named filter set; the editor shows the matching data files on the map, as list, as media gallery and in a 3D city model, and lets the user (de)select single files.

## Files

| File / folder                                              | Purpose                                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `journey.module.ts`, `journey.routing-module.ts`           | Module and the `''` / `:id` routes.                                                                             |
| `journey.component.*`                                      | Page layout: side buttons (view switch, save, download), map + filter blocks + tabs (collections, gallery, 3D). |
| `services/`                                                | `JourneyService`: all journey state (provided per `JourneyComponent`).                                          |
| `collection-list/`, `collection/`, `data-file-list-entry/` | Collections tab.                                                                                                |
| `gallery-view/`                                            | Media gallery tab.                                                                                              |
| `threejs-view/`                                            | 3D tab (Three.js).                                                                                              |
| `continue-journey-dialog/`                                 | Save dialog (title, description, tags).                                                                         |

## JourneyComponent

- Reads `:id` from the route and calls `JourneyService.loadJourney(id)`; navigates to `/journey` if loading fails.
- `view`: `'default'` (map + content) or `'no-map'`.
- Map filters: the selected collection's positive `content.location` RADIUS/AREA filters are passed to `<app-map [presetFilters]>`; drawn filters come back via `(filterUpdated)` → `JourneyService.addMapFilters()`.
- `collectionDataToDisplayCollection()` turns collection data into map points (`DisplayCollection`), using `content.location.coordinates` or, for SimRa-like data, `content.coords.{longitude,latitude}`.
- `saveJourney()` opens the save dialog and navigates to the new journey id; `download()` downloads the selected data.
- Switching to the 3D tab calls `ThreeJSComponent.loadRenderer()`, leaving it `unloadRenderer()`.

Backend: `GET /api/journey/:id`, `POST /api/journey`, `POST /api/datafile/filter/limit=999999&skip=0&onlyMetadata=true`.

## Gotchas

- `JourneyService` is provided in `JourneyComponent.providers`; child components inject that instance (tests provide it explicitly).
- Saving always creates a **new** journey (`parentID` = previous id), it never overwrites.
- Collections fetch up to 999 999 files at once (no paging).
