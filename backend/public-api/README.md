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

| Method | Path                                                                     | Purpose                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/datafile/limit={limit}&skip={skip}&onlyMetadata={onlyMetadata}`        | Paginated list; `onlyMetadata=true` drops `content.data`                                                                                                                       |
| GET    | `/datafile/{documentId}`                                                 | One datafile (NetCDF data is re-attached from GridFS)                                                                                                                          |
| POST   | `/datafile`                                                              | Create a datafile from JSON (`DatafileCreateParams`)                                                                                                                           |
| PUT    | `/datafile/{documentId}`                                                 | Replace fields of a datafile (`DatafileUpdateParams`)                                                                                                                          |
| DELETE | `/datafile/{documentId}`                                                 | Delete one datafile                                                                                                                                                            |
| POST   | `/datafile/deleteMany`                                                   | Delete by `{ documentIDs: string[] }`, returns the deleted documents                                                                                                           |
| POST   | `/datafile/{documentID}/attach`                                          | multipart: `file` + `fileType` (`JSON`, `CSV`, `TXT`, `NETCDF`); replaces `content.data` of a `NOTREFERENCED` datafile                                                         |
| POST   | `/datafile/fromFile`                                                     | multipart: `file` + `dataset` (`SIMRA`, `CSV`, `CERV2`) + optional `tags` (comma separated), `description`, `steps` (CERv2 sampling); creates one datafile per row / datapoint |
| POST   | `/datafile/filter/limit={limit}&skip={skip}&onlyMetadata={onlyMetadata}` | Filter with a `FilterSetParams` body                                                                                                                                           |
| GET    | `/datafile/nestedValue/{documentId}/{path}`                              | Read a nested value, e.g. `content.data.foo[0]`                                                                                                                                |
| PUT    | `/datafile/nestedValue/put`                                              | Set `{ IDs, path, value }` on several datafiles (`IDs` comma separated)                                                                                                        |
| DELETE | `/datafile/nestedValue/delete`                                           | Unset `{ IDs, path }` on several datafiles                                                                                                                                     |

### Journey (`src/controllers/journey.controller.ts`)

| Method | Path                                        | Purpose                                       |
| ------ | ------------------------------------------- | --------------------------------------------- |
| GET    | `/journey/limit={limit}&skip={skip}`        | Paginated list                                |
| GET    | `/journey/{journeyId}`                      | One journey                                   |
| POST   | `/journey`                                  | Create (`JourneyCreateParams`)                |
| PUT    | `/journey/{journeyId}`                      | Update (`JourneyUpdateParams`)                |
| DELETE | `/journey/{journeyId}`                      | Delete one journey                            |
| POST   | `/journey/deleteMany`                       | Delete by `{ documentIDs: string[] }`         |
| POST   | `/journey/filter/limit={limit}&skip={skip}` | Filter journeys with a `FilterSetParams` body |

### Not authenticated

| Path      | Purpose                             |
| --------- | ----------------------------------- |
| `/health` | `{"status":"healthy"}`              |
| `/docs`   | Swagger UI for `build/swagger.json` |

Paginated responses have the shape `{ skip, limit, totalCount, results }`.

### Error responses (`src/middlewares/error.middleware.ts`)

| Error                                                                                                      | Status |
| ---------------------------------------------------------------------------------------------------------- | ------ |
| tsoa `ValidateError` (body/path/form validation)                                                           | 422    |
| `NotFoundError`                                                                                            | 404    |
| `OperationNotSupportedError`, `WrongObjectTypeError`, `FailedToParseError`, malformed JSON (`SyntaxError`) | 400    |
| `UnauthorizedError`                                                                                        | 401    |
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
  `excludedIDs[]`, timestamps.
- **Filters** (`FilterSetParams = { filterSet: AnyFilter[] }`): each filter is
  `{ key, operation, value, negate }` with `CONTAINS`/`MATCHES` (strings, `_id` is
  converted to an ObjectId), `EQ`/`GT`/`GTE`/`LT`/`LTE` (numbers), `IS` (booleans),
  `RADIUS` (`{ center: [lon, lat], radius }` in km) and `AREA` (`{ vertices }` polygon), or a
  `{ booleanOperation: "AND" | "OR", filters }` concatenation. Every entry becomes one
  `$match` stage of an aggregation pipeline (entries are AND-ed).
- **GridFS bucket `netcdf`**: converted NetCDF payloads are stored as
  `<datafileId>.netcdf.json`; the datafile only keeps `content.data.dataObject.dataId`.

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
npm test                # 27 suites / 136 tests
npm run test:coverage   # ~91 % statements, ~79 % branches
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

## Docker

`server.Dockerfile` is built from the **repository root** (it needs `common/types`):

```bash
docker build -f backend/public-api/server.Dockerfile -t tcf-public-api .
docker run -p 8080:8080 -e MONGODB_URL=mongodb://host.docker.internal:27017/datastore tcf-public-api
```

Two stages on `node:24-slim`: the builder runs `npm ci` + `npm run build`, the runtime
stage installs production dependencies only and runs
`node dist/backend/public-api/src/index.js` as the `node` user (`PORT` defaults to 8080 in
the image; docker compose overrides it).

## Build layout

`tsconfig.json` uses `rootDir: "../.."` because the API imports `../../common/types`.
The compiled entry point therefore is `dist/backend/public-api/src/index.js`;
`dist/common/types` and `dist/backend/public-api/build` (routes + swagger.json) sit next to it.
`build/` and `dist/` are generated and git-ignored.

## Security notes

- `DISABLE_SWAGGER_AUTH=true` switches off authentication for the whole API. Before this
  modernisation an unset variable also meant "disabled"; now only an explicit `true` does
  (the root `.env` sets `false`). Never enable it in production.
- There is no authorisation layer: every valid Firebase user can read, change and delete all
  datafiles and journeys (also `PRIVATE` journeys and other authors' journeys).
- CORS allows every origin (`origin: "*"`).
- Uploads are buffered completely in memory by multer without a size limit, and the JSON body
  limit is Express' default (100 kB). Large NetCDF/SimRa uploads can exhaust memory; the server
  starts with `--max-old-space-size=4096`.
- `CONTAINS` filters pass the user value to MongoDB as a regular expression
  (`$regex`, case-insensitive) without escaping, so expensive patterns are possible.
- The nested-value endpoints let clients `$set`/`$unset` arbitrary paths of a datafile.

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
- **CERv2 uploads** (`/fromFile` with `CERV2`) create the datafiles but respond with an empty
  array, because the datapoints are streamed into the database one by one.
- `npm audit` still reports advisories for `nodemon` (dev only, via chokidar/braces) and
  `@tsoa/cli` (see above); they need breaking upgrades upstream.

## Credits

Built with the help of:

- [Node.js, Express & MongoDb: Build a CRUD Rest Api example](https://www.bezkoder.com/node-express-mongodb-crud-rest-api/)
- [Dockerizing a Node.js web app](https://nodejs.org/en/docs/guides/nodejs-docker-webapp)
- [How to run MongoDB with Docker and Docker Compose a Step-by-Step guide](https://geshan.com.np/blog/2023/03/mongodb-docker-compose/)
- [How to spin MongoDB server with Docker and Docker Compose](https://dev.to/sonyarianto/how-to-spin-mongodb-server-with-docker-and-docker-compose-2lef)
- [Let’s Dockerize a Node.js Express App](https://itnext.io/lets-dockerize-a-nodejs-express-api-22700b4105e4)
