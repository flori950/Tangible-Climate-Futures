# src/services

Business logic used by the controllers.

| File / folder          | Purpose                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crud.service.ts`      | Abstract `CrudService<T, Create, Update>` on top of a Mongoose model: `create`, `get`, `getAll` (aggregation with `$skip`/`$limit` + `countDocuments`), `update` (`findByIdAndUpdate`, returns the new document), `delete` (`findByIdAndDelete`), `deleteMany` (returns the documents that existed). Throws `NotFoundError` for unknown IDs. |
| `netcdfApi.service.ts` | Static HTTP client (axios) for the Python data-science service: `getMetaData`, `getFileData`, `getCERv2DataChunks` (async generator over a stream split by `CHUNK_SEPARATOR`). Errors become `FailedToParseError`.                                                                                                                           |
| `datafile/`            | `DatafileService` and the upload parsers.                                                                                                                                                                                                                                                                                                    |
| `journey/`             | `JourneyService`.                                                                                                                                                                                                                                                                                                                            |
| `filter/`              | Translation of API filters into MongoDB queries.                                                                                                                                                                                                                                                                                             |
| `bucket/`              | GridFS storage for large NetCDF payloads.                                                                                                                                                                                                                                                                                                    |

## Gotchas

- Services are created per request (inside the controllers). They must not cache data that
  depends on the database connection at construction time (see `bucket/`).
- `netcdfApi.service.ts` reads `DATASCIENCE_BASE_URL` at import time.
