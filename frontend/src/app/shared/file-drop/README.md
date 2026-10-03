# shared/file-drop

`<app-file-drop>`: single-file picker with a "choose file" button and a drag & drop area. It replaced PrimeNG's `p-fileUpload` (PrimeNG 22 is no longer MIT licensed). It does not upload anything; the parent receives the `File`.

|           | Name           | Type     | Meaning                                                                               |
| --------- | -------------- | -------- | ------------------------------------------------------------------------------------- |
| `@Input`  | `accept`       | `string` | Like `<input accept>`: extensions (`.csv`), MIME types or `type/*`; empty = any file. |
| `@Input`  | `chooseLabel`  | `string` | Button label.                                                                         |
| `@Input`  | `file`         | `File`   | Currently selected file, shown instead of the hint.                                   |
| `@Output` | `fileSelected` | `File`   | Chosen or dropped file that matches `accept`.                                         |
| `@Output` | `fileCleared`  | `void`   | Remove button clicked.                                                                |

Projected content is the hint text shown while no file is selected. Dropped files that do not match `accept` are rejected with an inline message (`upload.invalidFileType`). Used by `upload-data/rawDatasets` and `upload-data/supportedDatasets`.
