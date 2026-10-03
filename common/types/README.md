# common/types/

Shared domain model of Tangible Climate Futures. Everything is re-exported from `index.ts`.

| File | Contents |
|---|---|
| `datafile.ts` | `Datafile` = `BaseDataFile` + `dataType` + `content`. Two variants: **REFERENCED** (`Ref`: URL to a photo/video/sound file plus a GeoJSON `Point`) and **NOTREFERENCED** (`NotRef`: arbitrary JSON `data`, optional location). Also `MediaType`, `Location`, the create/update param types used by tsoa, and `NestedValueUpdateParams`/`NestedValueDeleteParams` for editing one nested key across many documents (`IDs` is comma separated, `path` is a dot path). |
| `filter.ts` | Key/operation/value filters. `FilterOperations`: strings `CONTAINS`/`MATCHES`, geo `RADIUS` (center + radius) / `AREA` (polygon vertices), boolean `IS`, numbers `EQ`/`GT`/`GTE`/`LT`/`LTE`. Every filter has `negate`. |
| `filterSet.ts` | Boolean composition: `ConcatenationFilter` groups filters with `AND`/`OR`; `FilterSet.filterSet` is a list of plain or grouped filters. |
| `journey.ts` | `Journey`: a saved, shareable query. Title, tags, author, optional `parentID` (forked from another journey), `collections` (each a titled filter set), `visibility` (`PUBLIC`/`PRIVATE`) and `excludedIDs` (datapoints the user unticked). |
| `mongooseObjectId.ts` | `MongooseObjectId` string alias; its `@pattern` tag makes tsoa validate 24-char hex IDs. |
| `pagination.ts` | `PaginationResult<T>`: `skip`, `limit`, `totalCount`, `results`. |
| `supportedFileTypes.ts` | `SupportedRawFileTypes` (JSON, CSV, TXT, NETCDF: attached as `content.data` of one datafile) vs. `SupportedDatasetFileTypes` (SIMRA, CERV2, CSV: split into many datafiles; NONE = no dataset parsing). |

## Gotchas

- `Filter` is a union keyed on `operation`; narrow on `operation` before reading `value`.
- Geo coordinates follow GeoJSON order: `[longitude, latitude]`.
