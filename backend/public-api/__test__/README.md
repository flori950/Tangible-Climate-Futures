# **test**

Jest 30 test suite (ts-jest, TypeScript transpiled with `tsconfig.test.json`). Run with
`npm test` or `npm run test:coverage`; `npm run typecheck` type-checks the tests.

| Folder / file    | Content                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setupEnv.ts`    | Jest `setupFiles`: sets `NODE_ENV=test`, `DISABLE_SWAGGER_AUTH=true` and a fake data-science host before any module is imported.                                  |
| `health.test.ts` | `/health` smoke test (no database).                                                                                                                               |
| `datafileTests/` | HTTP tests (supertest) for the datafile CRUD, upload and nested-value endpoints.                                                                                  |
| `filtersTests/`  | HTTP tests for every filter operation on datafiles and journeys.                                                                                                  |
| `journeyTests/`  | HTTP tests for the journey CRUD endpoints.                                                                                                                        |
| `serviceTests/`  | Service-level tests against an in-memory MongoDB (CRUD service, journey ownership incl. HTTP with Firebase mocked, datafile service, uploads, GridFS, hardening). |
| `unitTests/`     | Pure unit tests with mocks (filters, utils, error middleware, authentication, app settings, NetCDF client).                                                       |
| `testFiles/`     | Sample upload files.                                                                                                                                              |
| `utils/`         | Shared helpers (database setup, JSON comparison).                                                                                                                 |

## Gotchas

- Every file that touches MongoDB starts its own mongodb-memory-server through
  `utils/database.ts`; the first run downloads a MongoDB binary (~100 MB) to
  `~/.cache/mongodb-binaries`. Tests run in band (`--runInBand`).
- Jest only transpiles (`isolatedModules`), so type errors in tests do not fail `npm test`; use
  `npm run typecheck`.
- `jest.mock` is hoisted; mocks for firebase-admin and axios are defined at the top of the
  respective test files.
