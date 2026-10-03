# shared/data-display

`<app-data-display [data] [width] [isDialog]>`: renders one data file.

- **Referenced** files (`content.url` + `mediaType`): `PHOTO` → `<img>`, `VIDEO` → `<youtube-player>` for YouTube links (`youtube.com/watch?v=…`, `youtu.be/…`) or `<video>`, `SOUNDFILE` → `<audio>`.
- **Not referenced** files: the JSON content in `ngx-json-viewer`. If the file was loaded with `onlyMetadata` (no `content.data`), the full file is fetched via `ApiService.getDatafile(id)`.
- `isDialog` switches to the dialog sizing CSS.

`data-display-dialog/`: `DataDisplayDialogComponent`, the same view inside a `MatDialog` (opened by `DialogService.openDisplayDataDialog`, data: `{ datafile }`).

Gotcha: the YouTube video id parser now also handles links without further query parameters (it returned a wrong substring before).
