# upload-data

Everything around creating data files. `UploadDataModule` is imported eagerly by `AppModule`.

| File / folder             | Route(s)                                          | Purpose                                                                                                                                                |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `upload-data.component.*` | `/upload`, `/upload-data`                         | Hub with two tile groups: raw data (no file, JSON, CSV, TXT, NetCDF) and supported datasets (SimRa, CERv2, CSV). Tiles are rebuilt on language change. |
| `no-file/`                | `/upload-data/no-file`, `/data-sets/:data-set-id` | Create or edit a data file without file upload (media link or free text).                                                                              |
| `rawDatasets/`            | `/upload-data/{json,csv,txt,netcdf}`              | Create a data file and attach one raw file.                                                                                                            |
| `supportedDatasets/`      | `/upload-dataset/{simra,cerv2,csv}`               | Import a dataset file that the backend splits into many data files.                                                                                    |
| `upload-data.module.ts`   |                                                   | Declares the four components; imports `MapModule`, `SharedModule` (tiles, file drop), Material, forms, router, `TranslatePipe`.                        |

`rawDatasets/`, `supportedDatasets/` and `no-file/` – original author: Florian Jäger (upload workflow TCF-113, PR #136; file upload TCF-74, PR #104; address lookup TCF-90, PR #103).

Gotchas: the NetCDF tile leads to `/upload-data/netcdf`, which is not implemented (no file type is set, so the upload form cannot be used). The keyword autocomplete suggests a fixed list (`SimRa`, `Kreuzberg`, `UdK`, `TU`).
