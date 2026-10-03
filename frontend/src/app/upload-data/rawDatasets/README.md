# upload-data/rawDatasets

`RawDatasetsUploadComponent`: creates one data file and attaches a raw JSON, CSV or TXT file to it. Original author: Florian Jäger (TCF-113, PR #136).

- The file type comes from the route (`/upload-data/json|csv|txt`) and sets `acceptFileFormat` for `<app-file-drop>`.
- Choosing a file sets the title to the file name without extension (if empty).
- Required: title, at least one tag, a file. Location (map click or fields) is optional.
- `uploadData()` → `ApiService.createDatafileWithFile()` (`POST /api/datafile`, then `POST /api/datafile/:id/attach` with `file` + `fileType`). HTTP 422 means "created, but the file could not be attached".

Fixes in the upgrade: the loading spinner is reset on errors; the location check tested `latitude` twice.
