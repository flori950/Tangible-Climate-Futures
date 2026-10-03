# src/services/datafile

`DatafileService` and the parsers for uploaded files.

| File                              | Purpose                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `datafile.service.ts`             | `DatafileService extends CrudService`. Adds `getAllExtended` (pagination + `onlyMetadata`), `attachFile` (JSON/CSV/TXT/NETCDF into `content.data` of a `NOTREFERENCED` datafile; NETCDF data goes to GridFS), `createFromFile` (dataset uploads), `getFiltered`, `getNestedValue`, `updateNestedValue`, `deleteNestedValue`. `get`/`getAllExtended` re-attach NetCDF data from GridFS. |
| `datafileRawParsing.service.ts`   | `handleJSONFile`, `handleCSVFile` (rows as objects, header line required), `handleTXTFile` (`{ text }`). Used by `attachFile`.                                                                                                                                                                                                                                                         |
| `datafileCSVParsing.service.ts`   | `handleCSVDatasetFile`: one datafile per CSV row, dataset `CSV`, location from the `lon`/`lat` columns.                                                                                                                                                                                                                                                                                |
| `datafileSimraParsing.service.ts` | `handleSimRaFile`: SimRa ride files (two CSV sections separated by `=========================`). Creates header (incident) and datapoint documents; datapoints reference the header IDs in `content.data.headersRefs`.                                                                                                                                                                 |
| `datafileCERV2.service.ts`        | `handleCERV2File`: CERv2 NetCDF files. Gets the metadata from the Python service, selects variables with `south_north`/`west_east` dimensions and stores one datafile per streamed datapoint (`steps` = sampling interval, default 10).                                                                                                                                                |

All datafiles created by one upload share a random `uploadID` (`crypto.randomUUID`) and get the
optional comma-separated `tags` and `description`.

## Gotchas

- Rows without valid `lon`/`lat` are stored without `location` (`utils.toPointLocation`).
- CSV/SimRa parse errors are reported as `FailedToParseError` (400).
- `createFromFile` with `CERV2` returns an empty array; the datafiles are written one by one
  while streaming.
- `updateNestedValue`/`deleteNestedValue` process the IDs one after another; an unknown ID
  aborts with 404, but earlier IDs are already changed. Paths use dot notation, `[n]` is
  converted to `.n`.
- Uploads are kept in memory (multer memory storage).
