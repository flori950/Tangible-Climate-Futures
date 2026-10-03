# src/services/datafile

`DatafileService` and the parsers for uploaded files.

| File                              | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `datafile.service.ts`             | `DatafileService extends CrudService`. Adds `getAllExtended` / `getFilteredExtended` (`onlyMetadata` drops `content.data`), `attachFile` (JSON/CSV/TXT/NETCDF into `content.data` of a `NOTREFERENCED` datafile; NETCDF data goes to GridFS), `createFromFile` (dataset uploads), `getNestedValue`, `updateNestedValue`, `deleteNestedValue` and the exported `toWritablePath()`. `get`/`getAllExtended` re-attach NetCDF data from GridFS; `delete`/`deleteMany` remove it. |
| `datafileRawParsing.service.ts`   | `handleJSONFile`, `handleCSVFile` (rows as objects, header line required), `handleTXTFile` (`{ text }`). Used by `attachFile`.                                                                                                                                                                                                                                                                                                                                               |
| `datafileCSVParsing.service.ts`   | `handleCSVDatasetFile`: one datafile per CSV row, dataset `CSV`, location from the `lon`/`lat` columns.                                                                                                                                                                                                                                                                                                                                                                      |
| `datafileSimraParsing.service.ts` | `handleSimRaFile`: SimRa ride files (two CSV sections separated by `=========================`). Creates header (incident) and datapoint documents; datapoints reference the header IDs in `content.data.headersRefs`.                                                                                                                                                                                                                                                       |
| `datafileCERV2.service.ts`        | `handleCERV2File`: CERv2 NetCDF files. Gets the metadata from the Python service, selects variables with `south_north`/`west_east` dimensions and stores one datafile per streamed datapoint (`steps` = sampling interval, default 10).                                                                                                                                                                                                                                      |

All datafiles created by one upload share a random `uploadID` (`crypto.randomUUID`) and get the
optional comma-separated `tags` (empty entries are dropped) and `description`.

## Gotchas

- Rows without valid `lon`/`lat` (missing, not numeric or out of range) are stored without
  `location` (`utils.toPointLocation`).
- CSV/SimRa parse errors are reported as `FailedToParseError` (400).
- CERv2 datafiles are written one by one while streaming; the response contains them **without**
  `content.data` (the NetCDF payloads would make it huge). Use `uploadID` to load them.
- `updateNestedValue`/`deleteNestedValue` first check that every ID is valid and exists
  (400/404, nothing is changed otherwise), then run one `updateMany`. Results come back in
  request order, duplicate IDs once. Paths use dot notation (`[n]` becomes `.n`) and only paths
  below `content`, `title`, `description` and `tags` are writable, without `$` operators.
- Uploads are kept in memory (multer memory storage, limited by `MAX_UPLOAD_SIZE_MB`).
