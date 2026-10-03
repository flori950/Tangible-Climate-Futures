# app/controllers/

The HTTP endpoints. Each module defines a flask-restx `Namespace` that `app/__init__.py` adds to the `Api` (prefix `/api`).

## Files

- `data_processing_controller.py`: the namespace `convert-netcdf-to-json` with three `POST` resources:
  - `/metadata` and `/data`: parser `upload_parser` (`file`)
  - `/cerv2-data-chunks`: parser `cerv2_parser` (`file`, `filter_variables`, `step_size`, optional `longitude_range`, `latitude_range`)

  Helpers: `_parse_csv`, `_parse_range` (two ints) and `_parse_step_size` (int ≥ 1) raise `InvalidRequestError` → 400. `_stream()` runs the service's eager phase and wraps the returned generator in `Response(..., mimetype="application/json")`.

## How it connects

The resources call the shared `data_processing_service` from `app/services`. Domain errors (`app/errors`) pass through unchanged. Any other exception from the eager phase becomes `FailedToParseError`. The error middleware turns both into JSON.

## Gotchas

- The service opens and validates the file **before** the response starts. Once the stream has begun, an error can no longer change the status code. That is why the validation happens up front.
- The restx parsers validate required fields themselves and answer 400 in restx's own format (`{"errors": {...}, "message": ...}`).
- `filter_variables` and `step_size` are required. The public API only sends them when they are set.
