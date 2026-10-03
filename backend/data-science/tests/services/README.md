# tests/services/

Unit tests for `app/services/data_processing_service.py`. No HTTP is involved: uploads are faked with `werkzeug.datastructures.FileStorage`.

## Files

- `test_data_processing_service.py`: the original 2023 unittest class, kept and fixed. It checks `preprocess_variables` (cropping, step size, transposition), `custom_encoder` (numpy arrays and scalars) and `change_dimensions_dict`. The dataset now lives in a temp dir; it used to leave `test_dataset.nc` in the working directory. The variables are filled with data, because the old assertions compared arrays of fill values and passed trivially.
- `test_cerv2_chunks.py`: the chunk stream end to end. It covers the point count, the `[x, y]` alignment of `vars` and `timeVars`, ranges plus `step_size`, NaN → `null`, the metadata and data documents, errors raised before streaming, path-traversal filenames and temp-file cleanup (including a generator closed early).

## Gotchas

`test_temp_files_are_removed` compares the `*.nc` files in the system temp dir before and after. Another process creating `.nc` temp files at the same moment could make it flaky.
