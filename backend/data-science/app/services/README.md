# app/services/

The conversion logic. `__init__.py` creates one shared `DataProcessingService` instance, `data_processing_service`, which the controllers use.

## Files

- `data_processing_service.py`
  - `DataProcessingService.convert_netcdf_metadata_to_json(file)`: dimensions, variable metadata, global attributes
  - `DataProcessingService.convert_netcdf_data_to_json(file)`: full data of every variable
  - `DataProcessingService.convert_cerv2_data_to_json_chunks(file, filter, longitude_range, latitude_range, step_size)`: one JSON object per grid point
  - `preprocess_variables(...)`: selects the requested variables, transposes them to `(west_east, south_north, time, …)`, crops by index range and thins by `step_size`. Raises `NoCoordinatesError` or `InvalidRequestError`.
  - `change_dimensions_dict(dims)`: computes the transpose order (`west_east`, `south_north`, `time`, rest)
  - `generate_cerv2_chunks(variables, time_variables)`: yields `{"x","y","vars","timeVars"}` + `CHUNK_SEPARATOR`
  - `custom_encoder` / `dumps`: simplejson with numpy support (`ndarray` → list, numpy scalar → `.item()`). NaN becomes `null`.

## Two-phase design

Each `convert_*` method **returns** a generator rather than being one:

1. **Eager:** writes the upload to a private `tempfile.mkstemp(".nc")` path (the client filename is never used), opens it with netCDF4 and validates. A failure raises at once and removes the temp file.
2. **Lazy:** the generator produces the JSON. In its `finally` it closes the dataset and deletes the temp file, including when the client disconnects.

## Gotchas

- `CHUNK_SEPARATOR = "||*split*||"` is a contract with `backend/public-api/src/services/netcdfApi.service.ts`.
- The original design saved the upload *inside* the generator. With Flask 3.1 / Werkzeug 3.1 the request's file stream is already closed by then, so every endpoint failed with `ValueError: read of closed file` (verified under gunicorn and the test client). The eager phase fixes this. The 2023 pins could not be installed on Python 3.13 for a comparison.
- Selected variables are read fully into memory (`var[:].filled()`). Masked cells become the fill value, not `null`.
- 2-D variables (e.g. `lon`/`lat` stored as `(south_north, west_east)`) are transposed like the time variables. Before this fix they kept their `(south_north, west_east)` order, so `vars` and `timeVars` of one chunk described mirrored grid points.
