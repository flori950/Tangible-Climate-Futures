# tests/controllers/

Endpoint tests for `app/controllers/data_processing_controller.py`, using Flask's test client from `conftest.py`.

- `test_data_processing_controller.py`: success cases for `/metadata`, `/data` and `/cerv2-data-chunks`. The response is split on `||*split*||` exactly as the public API does it. Also: missing `file`/`step_size` (restx parser 400), non-NetCDF upload (400), invalid `step_size` and ranges, variables without coordinates, and unknown variables.
