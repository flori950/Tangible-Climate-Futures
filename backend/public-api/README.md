# Public API (Express + tsoa)

The public REST API of Tangible Climate Futures. It stores **datafiles** (single
datapoints, media references or uploaded datasets) and **journeys** (curated
collections of filters) in MongoDB, serves an OpenAPI/Swagger UI and forwards
NetCDF files to the Python data-science service for conversion.

| Stack     | Version                                                       |
| --------- | ------------------------------------------------------------- |
| Runtime   | Node.js 24 LTS (Docker), works for development on Node >= 22  |
| Framework | Express 5, tsoa 6 (routes, validation and OpenAPI 3 spec)     |
| Database  | MongoDB via Mongoose 9, GridFS for large NetCDF payloads      |
| Auth      | Firebase ID tokens verified with firebase-admin 14            |
| Uploads   | multer 2 (in memory), csv-parse 7                             |
| Tooling   | TypeScript 6, Jest 30 + ts-jest, ESLint 10 (flat), Prettier 3 |

## Quick start

```bash
cd backend/public-api
npm ci
npm run build                 # tsoa spec-and-routes + tsc -> dist/
MONGODB_URL=mongodb://localhost:27017/datastore DISABLE_SWAGGER_AUTH=true npm start
```

- API: `http://localhost:40000/api`
- Swagger UI: `http://localhost:40000/docs`
- Health check: `http://localhost:40000/health`

A local MongoDB can be started from the repository root with `npm run deploy:mongo`
(docker compose). The data-science service is only needed for NetCDF / CERv2 uploads.

## Scripts

| Script                  | What it does                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run build`         | Generates `build/routes.ts` + `build/swagger.json` with tsoa, then compiles everything to `dist/` |
| `npm start`             | Runs the compiled server `dist/backend/public-api/src/index.js` (run `build` first)               |
| `npm run start:dev`     | `build` + `start`                                                                                 |
| `npm run dev`           | nodemon: rebuild and restart on changes in `src/` and `../../common/types`                        |
| `npm test`              | Jest test suite (in band, in-memory MongoDB)                                                      |
| `npm run test:e2e`      | Builds and runs the local end-to-end scenarios (`scripts/e2e-local.mjs`), see below               |
| `npm run test:coverage` | Same with coverage report (`coverage/`)                                                           |
| `npm run typecheck`     | Type-checks sources **and tests** (`tsconfig.test.json`), Jest itself only transpiles             |
| `npm run lint`          | ESLint (flat config `eslint.config.mjs`, typescript-eslint)                                       |
| `npm run format`        | Prettier check, `format:fix` writes                                                               |

## Endpoints

All routes below are prefixed with `/api` and require `Authorization: Bearer <Firebase ID token>`
(see [Authentication](#authentication)). Path parameters typed `MongooseObjectId` must match
`^[0-9A-Fa-f]{24}$`, otherwise tsoa answers `422`. The authoritative spec is
`build/swagger.json` (generated, served at `/docs`).

### Datafile (`src/controllers/datafile.controller.ts`)

| Method | Path                                                                     | Purpose                                                                                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/datafile/limit={limit}&skip={skip}&onlyMetadata={onlyMetadata}`        | Paginated list; `onlyMetadata=true` drops `content.data`                                                                                                                                                                                   |
| GET    | `/datafile/{documentId}`                                                 | One datafile (NetCDF data is re-attached from GridFS)                                                                                                                                                                                      |
| POST   | `/datafile`                                                              | Create a datafile from JSON (`DatafileCreateParams`)                                                                                                                                                                                       |
| PUT    | `/datafile/{documentId}`                                                 | Replace fields of a datafile (`DatafileUpdateParams`)                                                                                                                                                                                      |
| DELETE | `/datafile/{documentId}`                                                 | Delete one datafile                                                                                                                                                                                                                        |
| POST   | `/datafile/deleteMany`                                                   | Delete by `{ documentIDs: string[] }`, returns the deleted documents                                                                                                                                                                       |
| POST   | `/datafile/{documentID}/attach`                                          | multipart: `file` + `fileType` (`JSON`, `CSV`, `TXT`, `NETCDF`); replaces `content.data` of a `NOTREFERENCED` datafile                                                                                                                     |
| POST   | `/datafile/fromFile`                                                     | multipart: `file` + `dataset` (`SIMRA`, `CSV`, `CERV2`) + optional `tags` (comma separated), `description`, `steps` (CERv2 sampling); creates one datafile per row / datapoint. CERv2 returns the created datafiles without `content.data` |
| POST   | `/datafile/filter/limit={limit}&skip={skip}&onlyMetadata={onlyMetadata}` | Filter with a `FilterSetParams` body                                                                                                                                                                                                       |
| GET    | `/datafile/nestedValue/{documentId}/{path}`                              | Read a nested value, e.g. `content.data.foo[0]`                                                                                                                                                                                            |
| PUT    | `/datafile/nestedValue/put`                                              | Set `{ IDs, path, value }` on several datafiles (`IDs` comma separated). All-or-nothing; only paths below `content`, `title`, `description`, `tags`                                                                                        |
| DELETE | `/datafile/nestedValue/delete`                                           | Unset `{ IDs, path }` on several datafiles (same rules)                                                                                                                                                                                    |

### Journey (`src/controllers/journey.controller.ts`)

| Method | Path                                        | Purpose                                           |
| ------ | ------------------------------------------- | ------------------------------------------------- |
| GET    | `/journey/limit={limit}&skip={skip}`        | Paginated list (public + own journeys)            |
| GET    | `/journey/{journeyId}`                      | One journey (404 for other users' PRIVATE)        |
| POST   | `/journey`                                  | Create (`JourneyCreateParams`), owner = user      |
| PUT    | `/journey/{journeyId}`                      | Update, owner only (403 otherwise)                |
| DELETE | `/journey/{journeyId}`                      | Delete one journey, owner only                    |
| POST   | `/journey/deleteMany`                       | Delete by `{ documentIDs: string[] }`, owner only |
| POST   | `/journey/filter/limit={limit}&skip={skip}` | Filter journeys with a `FilterSetParams` body     |

### Not authenticated

| Path      | Purpose                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `/health` | Liveness: `{"status":"healthy"}`                                        |
| `/ready`  | Readiness: 200 `{"status":"ready"}` when MongoDB is connected, else 503 |
| `/docs`   | Swagger UI for `build/swagger.json`                                     |

Paginated responses have the shape `{ skip, limit, totalCount, results }`. `limit` is capped
at 1000 and negative `skip` values are treated as 0; the response echoes the values used.

### Error responses (`src/middlewares/error.middleware.ts`)

| Error                                                                                                      | Status |
| ---------------------------------------------------------------------------------------------------------- | ------ |
| tsoa `ValidateError` (body/path/form validation)                                                           | 422    |
| `NotFoundError`                                                                                            | 404    |
| `OperationNotSupportedError`, `WrongObjectTypeError`, `FailedToParseError`, malformed JSON (`SyntaxError`) | 400    |
| Invalid GeoJSON location (MongoDB error 16755), multer errors other than file size                         | 400    |
| `UnauthorizedError`                                                                                        | 401    |
| `ForbiddenError` (journey of another user)                                                                 | 403    |
| File above `MAX_UPLOAD_SIZE_MB`, body above `JSON_BODY_LIMIT` (`PayloadTooLargeError`)                     | 413    |
| Other 4xx errors of Express' body parsers (e.g. 415)                                                       | as is  |
| Mongoose errors and anything else                                                                          | 500    |

## Data models

The TypeScript types live in [`common/types`](../../common/types) and are shared with the
Angular frontend; the Mongoose schemas are in [`src/models`](src/models).

- **Datafile** (`datafiles` collection): `title`, `description?`, `tags[]`, `dataType`
  (`REFERENCED` = `content: { url, mediaType, location }`, `NOTREFERENCED` =
  `content: { data, location? }`), `dataSet` (`NONE`, `SIMRA`, `CERV2`, `CSV`),
  `uploadID?` (shared by all datafiles created from one upload), timestamps.
  `location` is GeoJSON `{ type: "Point", coordinates: [lon, lat] }`.
- **Journey** (`journeys` collection): `title`, `description?`, `tags[]`, `author`,
  `parentID?`, `visibility` (`PUBLIC`/`PRIVATE`), `collections[]` (`{ title, filterSet }`),
  `excludedIDs[]`, timestamps, plus the internal `ownerUID` (Firebase UID of the creator,
  `select: false`, never returned and not accepted from clients).
- **Filters** (`FilterSetParams = { filterSet: AnyFilter[] }`): each filter is
  `{ key, operation, value, negate }` with `CONTAINS`/`MATCHES` (strings, `_id` is
  converted to an ObjectId; `CONTAINS` is a literal, case-insensitive substring search, max.
  200 characters), `EQ`/`GT`/`GTE`/`LT`/`LTE` (numbers), `IS` (booleans),
  `RADIUS` (`{ center: [lon, lat], radius }` in km) and `AREA` (`{ vertices }` polygon), or a
  `{ booleanOperation: "AND" | "OR", filters }` concatenation. Every entry becomes one
  `$match` stage of an aggregation pipeline (entries are AND-ed).
- **GridFS bucket `netcdf`**: converted NetCDF payloads are stored as
  `<datafileId>.netcdf.json`; the datafile only keeps `content.data.dataObject.dataId`.
  The file is removed when the datafile is deleted or another file type is attached.
- **Indexes**: `datafiles.uploadID`, a `2dsphere` index on `content.location` (used by
  `RADIUS`/`AREA`; locations must be valid `[lon, lat]`), `journeys.ownerUID`.

## Configuration

`src/config/config.ts` reads environment variables only (docker compose passes them from
the repository-root `.env`; nothing is read from `.env` directly when running `npm start`).

| Variable               | Default                               | Meaning                                                                                    |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `MONGODB_URL`          | `mongodb://localhost:27017/datastore` | MongoDB connection string                                                                  |
| `PORT`                 | `40000`                               | HTTP port                                                                                  |
| `HOST`                 | `localhost`                           | Only used in log output                                                                    |
| `DISABLE_SWAGGER_AUTH` | `false`                               | `true` disables authentication for **all** API endpoints (not only Swagger)                |
| `PYTHON_BACKEND_HOST`  | `localhost`                           | Host of the data-science service                                                           |
| `PYTHON_BACKEND_PORT`  | `50000`                               | Port of the data-science service                                                           |
| `FIREBASE_PROJECT_ID`  | unset                                 | Firebase project whose ID tokens are accepted (falls back to `GOOGLE_CLOUD_PROJECT` / ADC) |
| `CORS_ORIGINS`         | `*`                                   | Allowed origins, comma separated (e.g. `https://tcf.example.org,http://localhost:4200`)    |
| `MAX_UPLOAD_SIZE_MB`   | `512`                                 | Maximum size of one uploaded file (uploads are kept in memory)                             |
| `JSON_BODY_LIMIT`      | `100kb`                               | Maximum JSON / urlencoded body size (Express syntax)                                       |
| `NODE_ENV`             | unset                                 | `test` silences request logging                                                            |

## Authentication

Every controller is decorated with `@Security("firebase")`. tsoa calls
`expressAuthentication` from `src/authentication.ts` for each request:

1. If `DISABLE_SWAGGER_AUTH` is exactly `true`, the request passes (development only).
2. Otherwise the `Authorization: Bearer <token>` header is verified with
   `getAuth().verifyIdToken()` of firebase-admin. Missing, malformed, expired or invalid
   tokens and unknown security schemes all result in `401`.

firebase-admin is initialised lazily on the first authenticated request with
`{ projectId: FIREBASE_PROJECT_ID }`. Verifying ID tokens does not need a service account.

### Authorisation

- **Journeys** belong to the user who created them (`ownerUID`). Other users only see
  `PUBLIC` journeys and cannot change or delete them (403); they can still create their own copy
  (`parentID`). Journeys without an owner (created earlier or with authentication disabled)
  remain open to everyone. With `DISABLE_SWAGGER_AUTH=true` no ownership rules apply.
- **Datafiles** are a shared data pool: every authenticated user can read and change all of
  them.

## Data-science service (NetCDF)

`src/services/netcdfApi.service.ts` posts uploaded files as multipart form data (`file`) to
`http://PYTHON_BACKEND_HOST:PYTHON_BACKEND_PORT/api/convert-netcdf-to-json/…`:

| Endpoint             | Used for                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `/metadata`          | NetCDF metadata (`attach` with `NETCDF`, CERv2 uploads)                                            |
| `/data`              | Full data of a NetCDF file (`attach` with `NETCDF`, stored in GridFS)                              |
| `/cerv2-data-chunks` | Streamed CERv2 datapoints separated by `\|\|*split*\|\|`, optional `filter_variables`, `step_size` |

Any failure is reported as `FailedToParseError` (`400`).

## Testing

```bash
npm test                # 31 suites / 182 tests
npm run test:coverage   # ~92 % statements, ~81 % branches
npm run typecheck       # type errors in tests are not reported by ts-jest (isolatedModules)
```

- Integration tests start an in-memory MongoDB per test file with
  [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server) (MongoDB 8.2,
  downloaded once to `~/.cache/mongodb-binaries`) via `__test__/utils/database.ts`.
- `__test__/setupEnv.ts` sets `NODE_ENV=test`, `DISABLE_SWAGGER_AUTH=true` and a fake
  data-science host before any module is loaded. Authentication is tested separately with
  firebase-admin mocked; the NetCDF client is tested with axios mocked. No test needs network
  access apart from the one-time MongoDB binary download.

See [`__test__/README.md`](__test__/README.md) for the layout.

### Local end-to-end scenarios

`npm run test:e2e` builds the API and runs [`scripts/e2e-local.mjs`](scripts/README.md): it
starts a real MongoDB (data on disk), the compiled server in four configurations (development,
production-like limits, authentication enabled, unreachable database) and optionally the real
Python data-science service, and checks 88 scenarios over HTTP: CRUD, uploads, all filters,
NetCDF/CERv2 with GridFS, the frontend's journey round trip, restarts, SIGTERM, missing
database, CORS and size limits, 401s. Results on 03.10.2026: 88/88 on Node 26.8.2 and on
Node 24.21.0 (with the Python service), 73/73 without it.

## Docker

`server.Dockerfile` is built from the **repository root** (it needs `common/types`):

```bash
docker build -f backend/public-api/server.Dockerfile -t tcf-public-api .
docker run -p 8080:8080 -e MONGODB_URL=mongodb://host.docker.internal:27017/datastore tcf-public-api
```

Two stages on `node:24-slim`: the builder runs `npm ci` + `npm run build`, the runtime
stage installs production dependencies only and runs
`node dist/backend/public-api/src/index.js` as the `node` user (`PORT` defaults to 8080 in
the image; docker compose overrides it). `SIGTERM`/`SIGINT` stop the server gracefully (open
requests finish, MongoDB is disconnected, forced exit after 10 s). Use `/ready` as readiness
and `/health` as liveness probe.

## Build layout

`tsconfig.json` uses `rootDir: "../.."` because the API imports `../../common/types`.
The compiled entry point therefore is `dist/backend/public-api/src/index.js`;
`dist/common/types` and `dist/backend/public-api/build` (routes + swagger.json) sit next to it.
`build/` and `dist/` are generated and git-ignored.

## Security notes

- `DISABLE_SWAGGER_AUTH=true` switches off authentication (and the journey ownership rules)
  for the whole API. Before this modernisation an unset variable also meant "disabled"; now
  only an explicit `true` does (the root `.env` sets `false`). Never enable it in production.
  The name was kept because docker compose and `.env` use it.
- Datafiles have no owner: every authenticated user can change and delete all of them.
- `CORS_ORIGINS` defaults to `*`; set it to the frontend's origin in production.
- Uploads are buffered in memory (multer), limited by `MAX_UPLOAD_SIZE_MB` (default 512 MB);
  the server starts with `--max-old-space-size=4096`.
- The nested-value endpoints can only change `content`, `title`, `description` and `tags`
  (no `_id`, `dataType`, `dataSet`, `uploadID`, timestamps, no `$` operators).

## Known issues

- **Node.js >= 25**: firebase-admin 14 depends (via `jsonwebtoken`/`jws`/`jwa`) on
  `buffer-equal-constant-time`, which uses the `SlowBuffer` API removed in Node 25. Loading
  `firebase-admin/auth` crashes there. The API therefore loads firebase-admin lazily: on
  Node >= 25 the server and the tests run, but every authenticated request is rejected with 401.
  Use Node 24 LTS (as in the Dockerfile) whenever authentication is enabled.
- **tsoa**: npm's `latest` tag of tsoa points to `7.0.0-alpha.0`; the API uses the newest
  stable release 6.6.0. Its `@tsoa/cli` bundles TypeScript 5.x for code generation and pulls in
  `ts-deepmerge` < 8 (moderate advisory, build-time only). `@tsoa/runtime` also declares Express 4
  as its own dependency; the generated routes run on the Express 5 of this package.
- **Firebase configuration**: the project ID used to be imported from
  `frontend/src/environments/environment.ts`. It now comes from `FIREBASE_PROJECT_ID`, which
  `docker-compose.yml` / `production.docker-compose.yml` do not pass yet.
- **MongoDB driver inside Jest**: the driver loads `os` with a dynamic `import()`, which Jest's
  CommonJS runtime cannot execute; the tests therefore pass `runtimeAdapters: { os }` to
  `mongoose.connect` (see `__test__/utils/database.ts`).
- **Not changed on purpose (would break the frontend):** pagination is part of the path
  (`limit=…&skip=…`) instead of query parameters, `deleteMany` uses `POST`, nested-value delete
  sends a body with `DELETE`, and `GET nestedValue/{id}/{path}` cannot contain `/` in the path.
  Changing these needs a coordinated frontend release.
- **Legacy data**: datafiles with invalid coordinates prevent the `2dsphere` index from being
  built on an existing database (Mongoose logs the index error; filters still work, without
  index). Journeys created before the ownership rules have no owner and stay open.
- **Logging** is plain `console`/morgan output; there is no structured logging or request ID yet.
- `npm audit` still reports advisories for `nodemon` (dev only, via chokidar/braces) and
  `@tsoa/cli` (see above); they need breaking upgrades upstream.

## Credits

Built with the help of:

- [Node.js, Express & MongoDb: Build a CRUD Rest Api example](https://www.bezkoder.com/node-express-mongodb-crud-rest-api/)
- [Dockerizing a Node.js web app](https://nodejs.org/en/docs/guides/nodejs-docker-webapp)
- [How to run MongoDB with Docker and Docker Compose a Step-by-Step guide](https://geshan.com.np/blog/2023/03/mongodb-docker-compose/)
- [How to spin MongoDB server with Docker and Docker Compose](https://dev.to/sonyarianto/how-to-spin-mongodb-server-with-docker-and-docker-compose-2lef)
- [Let’s Dockerize a Node.js Express App](https://itnext.io/lets-dockerize-a-nodejs-express-api-22700b4105e4)
