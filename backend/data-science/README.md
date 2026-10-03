# Data-science service (Python / Flask)

A small Flask microservice that converts NetCDF files, and CERV2 climate-model output in particular, into JSON. It has no database and no state. The public API (`backend/public-api`, Node/Express) forwards uploaded files to it and stores the JSON it gets back in MongoDB.

- Python 3.12+ (developed and tested on 3.13)
- Flask 3.1 + flask-restx 1.3 (Swagger UI), netCDF4 1.7, numpy 2.5, simplejson, gunicorn 26
- Default port **50000**, health check at `GET /health`

## Endpoints

All API routes live under the `/api` prefix in the restx namespace `convert-netcdf-to-json`. Every endpoint takes a `multipart/form-data` upload with a `file` field and streams `application/json` back. The interactive Swagger UI is at `/docs` and the spec at `/api/swagger.json`.

| Method + path | Form fields | Response |
|---|---|---|
| `GET /health` | – | `{"status":"healthy"}` |
| `POST /api/convert-netcdf-to-json/metadata` | `file` | one JSON object: `dimensions` (name → size), `variables_metadata` (name → `{dimensions, attributes}`), `global_attributes` |
| `POST /api/convert-netcdf-to-json/data` | `file` | `{"variables_data": {name: {"dimensions": [...], "data": nested lists}}}` for every variable |
| `POST /api/convert-netcdf-to-json/cerv2-data-chunks` | `file`, `filter_variables` (required, comma-separated names), `step_size` (required, integer ≥ 1), `longitude_range` / `latitude_range` (optional, `"start,end"` index ranges) | a stream of JSON objects, one per grid point, each followed by the separator `\|\|*split*\|\|` |

### CERV2 chunk format

CERV2 files are WRF-style grids with the dimensions `south_north` and `west_east`, often combined with `time` and other axes such as `soil`. For `cerv2-data-chunks` the service:

1. keeps only the variables named in `filter_variables`. Each one must have both `south_north` and `west_east`, otherwise the request fails with a 400.
2. transposes every variable to `(west_east, south_north, time, other…)`, so `[x, y]` means the same grid point for all variables.
3. crops with `longitude_range` (indices on `west_east`) and `latitude_range` (indices on `south_north`). These are **array indices**, not degrees.
4. keeps every `step_size`-th point in both directions.
5. emits one object per remaining `(x, y)`:

```json
{"x": 0, "y": 1,
 "vars":     {"lon": 11.09, "lat": 51.34},
 "timeVars": {"0": {"tslb": [279.77, 278.62, 278.26, 278.69]}, "1": {...}}}||*split*||
```

`vars` holds the variables without a `time` dimension, and `timeVars` maps each time index to the values at that time. Extra axes, such as the 4 soil layers in the example, become lists. `NaN` is written as `null`. Masked values are written as the variable's fill value.

### Errors

Every error has the same JSON shape, `{"error": "<reason>", "message": "<text>"}`:

| Case | Status |
|---|---|
| file is not readable NetCDF | 400 `Error processing the file` |
| bad `step_size` / range, unknown variables | 400 |
| variable without `south_north`/`west_east` | 400 |
| missing required form field (restx validation) | 400, restx format `{"errors": {...}, "message": ...}` |
| unknown route / wrong method | 404 / 405 |
| anything else | 500 `An unexpected error occurred` (details go only to the log) |

## How the public API calls it

`backend/public-api/src/config/config.ts` builds the base URL `http://${PYTHON_BACKEND_HOST}:${PYTHON_BACKEND_PORT}/api`. `src/services/netcdfApi.service.ts` posts the uploaded file with axios (`responseType: "stream"`):

- `getMetaData` → `/metadata`, and `getFileData` → `/data`: both join the stream and run `JSON.parse` once.
- `getCERv2DataChunks` → `/cerv2-data-chunks` with `filter_variables` and `step_size`: splits the stream on `||*split*||` and yields one object per grid point. `datafileCERV2.service.ts` then needs `lon` and `lat` in `vars` for each point's GeoJSON location.

If you change the separator, the field names or the chunk shape, update the public API in the same change.

## Configuration

| Variable | Default | Used by |
|---|---|---|
| `STAGE` | `development` | `main.py` → `config/app_config.py` (`development` = Flask debug on, `production` = off; unknown values fall back to development) |
| `HOST` | `localhost` | `python main.py` only |
| `PORT` | `50000` | `python main.py` and the Docker `CMD` |
| `GUNICORN_TIMEOUT` | `1200` (Docker) | worker timeout in seconds. Large files take a long time to convert |

## Setup

### venv + pip (recommended)

```bash
cd backend/data-science
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt   # runtime + pytest, pytest-cov, ruff
```

`requirements.txt` lists the full runtime dependency set with pinned versions (this is what Docker installs). `requirements-dev.txt` adds the tools on top. `.venv/` is ignored by `backend/data-science/.gitignore`.

### pipenv (alternative)

```bash
cd backend/data-science
pipenv install --dev      # uses Pipfile / Pipfile.lock (Python 3.13)
pipenv run tests
```

`Pipfile` pins the same direct versions as the requirements files, and `Pipfile.lock` matches `requirements.txt`. When you bump a version, update `Pipfile`, `requirements*.txt` and the lock (`pipenv lock`) together.

## Run

```bash
.venv/bin/python main.py                                   # Flask dev server, debug on, localhost:50000
STAGE=production .venv/bin/gunicorn main:app --bind localhost:50000 --timeout 1200
```

Pipenv equivalents: `pipenv run dev` and `pipenv run start`. The root `package.json` (`npm run dev:ds`) also uses pipenv.

## Tests, coverage, lint

```bash
.venv/bin/python -m pytest                                 # 68 tests
.venv/bin/python -m pytest --cov --cov-report=term         # coverage of app/ and config/ (branch)
.venv/bin/ruff check .
.venv/bin/ruff format --check .                            # or `ruff format .` to apply
```

`pyproject.toml` holds the pytest, coverage and ruff settings. Pytest treats warnings as errors, with one documented exception (see Known issues). The tests build tiny NetCDF files at runtime, so no binary fixtures are checked in.

## Docker

The build context is the **repository root**, as in `docker-compose.yml` and `production.docker-compose.yml`:

```bash
docker build -f backend/data-science/Dockerfile -t tcf-data-science .
docker run --rm -p 50000:50000 tcf-data-science
curl http://localhost:50000/health    # {"status":"healthy"}
```

The image is based on `python:3.13-slim`. It installs `requirements.txt` with pip, runs as UID 1000 and starts `gunicorn main:app --bind 0.0.0.0:$PORT --timeout $GUNICORN_TIMEOUT --no-control-socket` with `STAGE=production`. A `HEALTHCHECK` polls `/health`. The CI workflow `docker-compose-tests.yaml` checks `http://localhost:50000/health` for the exact body `{"status":"healthy"}`.

## Layout

```
.
├── app/                 Flask app factory + restx Api (see app/README.md)
│   ├── controllers/     HTTP endpoints, form parsing
│   ├── services/        NetCDF → JSON conversion
│   ├── middlewares/     JSON error handlers
│   └── errors/          domain exceptions with HTTP status
├── config/              Flask config classes per STAGE
├── tests/               pytest suite (+ conftest with NetCDF fixtures)
├── main.py              entry point: builds `app` from STAGE; `python main.py` runs the dev server
├── Dockerfile           production image (build from repo root)
├── requirements.txt     pinned runtime dependencies
├── requirements-dev.txt runtime + pytest, pytest-cov, ruff
├── Pipfile / .lock      pipenv alternative, same versions
└── pyproject.toml       pytest / coverage / ruff configuration
```

## Known issues

- **Memory use:** each requested variable is read completely into memory (`var[:]`). `/data` also builds the whole JSON document in memory before sending it. Very large files therefore need a lot of RAM, and the "streaming" only spreads the sending over time. `cerv2-data-chunks` streams per point but still loads the selected variables in full.
- **`timeVars` keys are strings** (`"0"`, `"1"`, …) because JSON object keys are strings.
- **Warning filter in the tests:** netCDF4 1.7.4 sets `ndarray.shape` when it *writes* 2-D+ data, which NumPy 2.5 deprecates. Only the test fixtures write files, and `pyproject.toml` ignores this one warning. Remove the filter once netCDF4 fixes it.
- `/health` is pretty-printed when debug is on (`STAGE=development`). The exact-match CI check only works with `STAGE=production`, which the Dockerfile sets.
- The public API never sends `longitude_range`/`latitude_range`, and it omits `step_size` when it is unset, which makes the request fail with a 400 (`step_size` is required).
