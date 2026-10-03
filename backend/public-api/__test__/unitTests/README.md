# **test**/unitTests

Unit tests without a database.

| File                      | Covers                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filterService.test.ts`   | Every filter operation, negation, `_id` conversion/validation, `AND`/`OR`, unsupported operations.                                                                                                          |
| `utils.test.ts`           | `parsePath`, `toPointLocation`, `parseBooleanFlag`.                                                                                                                                                         |
| `errorMiddleware.test.ts` | Status code and body for every error type (incl. 403, 413, multer, `http-errors`, GeoJSON), non-`Error` throwables, `headersSent`.                                                                          |
| `authentication.test.ts`  | `expressAuthentication` with firebase-admin mocked: bypass only for `DISABLE_SWAGGER_AUTH=true`, missing/malformed/invalid tokens, unknown schemes, app reuse, plus a 401 end-to-end check through the app. |
| `appConfig.test.ts`       | Config parsers; with `config` mocked: CORS origin list, 413 for uploads above `MAX_UPLOAD_SIZE_MB` and bodies above `JSON_BODY_LIMIT`, `/ready` 503 without database, graceful `shutdown()`.                |
| `netcdfApi.test.ts`       | NetCDF client with axios mocked: URLs, multipart body, streamed JSON, multi-byte characters across chunks, chunk splitting, error mapping.                                                                  |

## Gotchas

- `authentication.test.ts` reloads modules with `jest.isolateModules` because the config is read
  at import time; it restores `DISABLE_SWAGGER_AUTH` afterwards.
- `appConfig.test.ts` mocks `process.exit` and `mongoose.connection.close` for the shutdown test.
