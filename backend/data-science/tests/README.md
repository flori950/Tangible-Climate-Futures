# tests/

The pytest suite for the service (68 tests). Run it from `backend/data-science/`:

```bash
.venv/bin/python -m pytest                          # all tests
.venv/bin/python -m pytest --cov --cov-report=term  # with branch coverage (app/, config/)
```

## Files

| Path | Covers |
|---|---|
| `conftest.py` | fixtures: `app`/`client` (production config, `TESTING=True`), `upload` (multipart tuple), and `cerv2_path`/`cerv2_bytes`/`cerv2_dataset`, a tiny CERV2-shaped NetCDF file written with netCDF4 into `tmp_path` |
| `test_app.py` | `/health` body as checked by CI, Swagger UI/spec, `get_flask_config`, `main.py` import |
| `controllers/` | endpoint tests through Flask's test client |
| `middlewares/` | error shapes for Flask routes and restx resources, status codes |
| `services/` | conversion and splitting logic without HTTP |

## The CERV2 fixture

The grid is `time=3, soil=2, south_north=4, west_east=5`, deliberately non-square. `lon = west_east index`, `lat = south_north index`, and `tslb[t, soil, sn, we] = 1000t + 100·soil + 10·sn + we`. Every value therefore encodes its own position, and an axis mix-up shows up as a wrong value. The file also has `time` (no spatial dimensions) and `nan_var` (NaN at `[0, 0]`).

## Gotchas

- `pyproject.toml` turns warnings into errors. The one exception is the netCDF4/NumPy 2.5 `shape` deprecation that occurs when the fixtures *write* NetCDF.
- Tests import `tests.conftest` constants, so run them from `backend/data-science/` (pytest's rootdir).
- `python -m unittest` still runs the unittest-style class in `services/test_data_processing_service.py`, but not the pytest functions.
