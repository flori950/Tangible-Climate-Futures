# Tangible Climate Futures

> **About this fork:** This is Florian Jäger's fork of [Corgam/SS23_ADSP_TCF](https://github.com/Corgam/SS23_ADSP_TCF), the team repository of the TU Berlin course *(Advanced) Distributed Systems Prototyping*, summer term 2023, built for and with the UdK Berlin team. My part in 2023 was the Angular frontend: the map view, translations, the header, file upload, address lookup, the upload workflow and the Browse Journeys page. In October 2026 the fork was brought up to date: all three services on current major versions, test suites that run again, CI for every part and a README in every directory. The production values in `.env` are placeholders; set your own before deploying.

A data-fusion platform for spatio-temporal climate and city data. Researchers and artists upload data points (files, media links, free text) with a location, filter them by text, numbers, booleans, radius or polygon, and combine filtered sets into **Journeys** that can be explored on a map, in a media gallery and in a 3D city model, saved, forked and downloaded.

Original team: **Simon Albani** (frontend, authentication), **Emil Balitzki** (backend: public API, MongoDB, filtering), **Theodor Barkow** (frontend, team lead), **Alexander Guttenberger** (backend: public API, Python), **Florian Jäger** (frontend), **Frederik Stalschus** (development features and deployment, Python backend). Supervision at TU Berlin: Ahmet-Serdar Karakaya and David Bermbach. The project wiki of the original repository describes the JSON objects in detail: <https://github.com/Corgam/SS23_ADSP_TCF/wiki>.

## Architecture

```
Browser ──► frontend (Angular 22, :8080) ──► public-api (Express 5 + tsoa, :40000) ──► MongoDB 8 (:27017, GridFS for NetCDF files)
                 │                                   │
                 └── Firebase Auth (ID token) ───────┤ verifies the token (firebase-admin)
                                                     └──► data-science (Flask 3, :50000): NetCDF / CERV2 → JSON chunks
```

| Part | Path | Stack | Tests | README |
|---|---|---|---|---|
| Frontend | `frontend/` | Angular 22, Angular Material, OpenLayers 10, three.js, ngx-translate, AngularFire | Vitest (jsdom), 156 tests | `frontend/README.md` |
| Public API | `backend/public-api/` | Node 24, Express 5, tsoa 6.6 (OpenAPI + routes), Mongoose 9, firebase-admin 14, multer 2 | Jest 30 + in-memory MongoDB, 136 tests | `backend/public-api/README.md` |
| Data-science service | `backend/data-science/` | Python 3.13, Flask 3.1, flask-restx, netCDF4, numpy 2, gunicorn | pytest, 68 tests, 99 % branch coverage | `backend/data-science/README.md` |
| Shared types | `common/types/` | TypeScript types used by frontend and API | (covered by both) | `common/README.md` |
| Helper scripts | `scripts/` | Mongo seed/cleanup, evaluation | | `scripts/README.md` |
| Deployment | `deploy/` | Terraform for one GCE VM running `production.docker-compose.yml` | | `deploy/README.md` |
| CI | `.github/` | GitHub Actions: one workflow per part plus a Docker Compose health check | | `.github/README.md` |

## Requirements

- Node.js **24 LTS** (the public API's firebase-admin does not load on Node ≥ 25; see `backend/public-api/README.md`)
- Python **3.12+** (3.13 recommended)
- Docker with the Compose plugin for the full-stack setup
- A Firebase project with Email/Password authentication, and its web config in `frontend/src/environments/environment*.ts`

## Configuration

All ports and hosts live in the root `.env`, which Docker Compose reads:

| Variable | Used by | Meaning |
|---|---|---|
| `STAGE` | public API | `development` / `production` |
| `DISABLE_SWAGGER_AUTH` | public API | `true` disables token checks for the **whole API** (for local Swagger use only) |
| `FIREBASE_PROJECT_ID` | public API | Firebase project whose ID tokens are accepted |
| `ANGULAR_FRONTEND_PORT` | frontend | default 8080 |
| `EXPRESS_BACKEND_HOST` / `_PORT` | public API | default `localhost:40000` |
| `PYTHON_BACKEND_HOST` / `_PORT` | public API → data-science | default `localhost:50000` |
| `MONGODB_PORT`, `MONGODB_URL` | public API (dev) | local MongoDB |
| `PROD_MONGODB_USERNAME` / `_PASSWORD` / `_URL` | production compose | placeholders, set your own |

## Quick start

### Everything in Docker

```bash
docker compose up -d --build --wait
# Frontend http://localhost:8080 · API http://localhost:40000 (Swagger /docs) · Python service http://localhost:50000 (Swagger /docs)
docker compose down
```

### Local development

```bash
npm run setup            # npm ci in frontend + public-api, venv + pip install for data-science
npm run deploy:mongo     # MongoDB in Docker
npm run dev:ds           # Python service (Flask dev server, :50000)
npm run dev:pub          # public API with nodemon (:40000)
npm run dev:frontend     # Angular dev server (:8080)
```

## Testing and quality checks

From the repository root:

```bash
npm test                 # all three suites: frontend (Vitest), public API (Jest), data-science (pytest)
npm run test:frontend
npm run test:backend
npm run test:python
npm run lint             # angular-eslint, ESLint, ruff
```

Per part (inside its folder): `npm run format:check` / `npm run format` (Prettier, frontend and API), `npm run typecheck` (API incl. tests), `npm run build`, `.venv/bin/ruff format --check .` (Python). CI runs exactly these steps, see `.github/README.md`.

## Deployment

`deploy/` contains the Terraform setup of the original 2023 production deployment on Google Cloud (one VM, Docker Compose, port 80). See `deploy/README.md` for the steps and the caveats; the original GCP project no longer exists.

## MongoDB helper scripts

```bash
python3 -m venv scripts/.venv && scripts/.venv/bin/pip install -r scripts/requirements.txt
scripts/.venv/bin/python scripts/mongo/main.py seed --num-documents 20 --mongo-url mongodb://localhost:27017/datastore
scripts/.venv/bin/python scripts/mongo/main.py cleanup --mongo-url mongodb://localhost:27017/datastore
```

## Root npm scripts

| Script | Does |
|---|---|
| `setup` / `setup:frontend` / `setup:backend` / `setup:python` | install dependencies (Python into `backend/data-science/.venv`) |
| `deploy` | `docker compose up --build -d` (whole stack) |
| `deploy:mongo` | only the MongoDB container |
| `dev:frontend` / `dev:pub` / `dev:ds` | dev servers with live reload |
| `dev:backend` | MongoDB + Python containers, public API in dev mode |
| `dev:all` | MongoDB container + all three dev servers via `concurrently` |
| `test`, `test:*`, `lint` | see above |

## Known issues

Each part lists its own known issues in its README. The most important ones:

- **AngularFire on Angular 22** only installs through npm `overrides`, and Firebase stays on 11.x until AngularFire supports Angular 22.
- **Node ≥ 25:** firebase-admin crashes on import, so the API rejects every authenticated request. Use Node 24.
- **No authorisation model:** any signed-in user can change any datafile and any journey, including private ones. CORS allows all origins, uploads have no size limit, and `CONTAINS` filters use user input as an unescaped regular expression.
- **Docker images and Terraform** were updated but not built or applied in this environment (no Docker, no Terraform installed); CI builds the images.
