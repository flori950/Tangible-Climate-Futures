# src/services/bucket

GridFS storage (MongoDB driver via `mongoose.mongo`) for payloads that are too large for a
MongoDB document (16 MB limit), currently the converted NetCDF data.

| File                      | Purpose                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bucket.service.ts`       | Abstract `BucketService`: `uploadFile(name, value, contentType?)` stores `JSON.stringify(value)` and first deletes files with the same name; `downloadFile(name)` returns the parsed JSON; `deleteFilesByName(name)`. |
| `netcdfBucket.service.ts` | `NetCDFJsonBucketService`: bucket `netcdf`, file names `<datafileId>.netcdf.json`, content type stored in the file metadata.                                                                                          |

Used by `services/datafile/datafile.service.ts` (`attachFile` with `NETCDF`, `get`,
`getAllExtended`).

## Gotchas

- The `GridFSBucket` is created lazily from `mongoose.connection.db`; calling the service without
  an open connection throws.
- Files live in the collections `netcdf.files` / `netcdf.chunks`. Deleting a datafile does
  **not** delete its GridFS file.
- The whole file is buffered in memory on upload and download.
