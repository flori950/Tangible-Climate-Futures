# upload-data/supportedDatasets

`SupportedDatasetsUploadComponent`: imports a dataset file that the backend converts into many data files. Original author: Florian Jäger (TCF-113, PR #136).

| Route                   | Dataset             | Accepted file                                                            |
| ----------------------- | ------------------- | ------------------------------------------------------------------------ |
| `/upload-dataset/simra` | SimRa bicycle rides | no extension, `.txt` or `.csv` (checked by MIME type in `formIsValid()`) |
| `/upload-dataset/cerv2` | CERv2 NetCDF        | `.nc`; extra field _steps_                                               |
| `/upload-dataset/csv`   | CSV                 | `.csv`                                                                   |

`uploadData()` → `ApiService.createDatasetFromFile(file, type, tags, description, steps)` (`POST /api/datafile/fromFile`, multipart). The file is picked with `<app-file-drop>`.
