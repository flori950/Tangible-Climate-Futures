# upload-data/no-file

`NoFileUploadComponent`: form for data files without an uploaded file. Original author: Florian Jäger (TCF-113, PR #136).

- **Create** (`/upload-data/no-file`): title, description, tags (chips with autocomplete), toggle _referenced data_:
  - referenced: media type (photo/video/sound) + URL → `content = { url, mediaType, location }` (`DataType.REFERENCED`);
  - not referenced: free text → `content = { data: { text }, location? }` (`DataType.NOTREFERENCED`).
- **Edit** (`/data-sets/:data-set-id`, linked from the data set table): loads the file via `ApiService.getDatafile`, fills the form, draws its location on the map; `updateData()` → `PUT /api/datafile/:id`.
- Location: longitude/latitude fields or a click on `<app-map [enableDrawFeatures]="false">` (`handleCoordinateChange`). Location is required by `formIsValid()`.
- `uploadData()` → `POST /api/datafile`, then resets the form and shows a snack bar.
