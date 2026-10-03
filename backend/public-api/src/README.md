# src

Source code of the public API. Compiled by `npm run build` to
`dist/backend/public-api/src/`.

| File / folder       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`          | Entry point: creates `App` and calls `start()` (connect to MongoDB, then listen). Exits with code 1 on failure.                                                                                                                                                                                                                                                                                                  |
| `app.ts`            | Builds the Express app: CORS (`CORS_ORIGINS`), logging (morgan, off when `NODE_ENV=test`), compression, helmet, JSON/urlencoded body parsing (`JSON_BODY_LIMIT`), `/docs` (Swagger UI), `/health`, `/ready`, the tsoa routes from `../build/routes` with a size-limited multer (`MAX_UPLOAD_SIZE_MB`) and the error middleware. `start()` connects and listens; `shutdown()` stops gracefully on SIGTERM/SIGINT. |
| `authentication.ts` | tsoa authentication module (configured in `tsoa.json`). Verifies Firebase ID tokens; bypassed only when `DISABLE_SWAGGER_AUTH=true`. `getRequestUserId(request)` returns the UID that tsoa stored in `request.user`.                                                                                                                                                                                             |
| `config/`           | Environment-based configuration.                                                                                                                                                                                                                                                                                                                                                                                 |
| `controllers/`      | tsoa controllers = HTTP endpoints.                                                                                                                                                                                                                                                                                                                                                                               |
| `services/`         | Business logic (CRUD, filters, ownership, file parsing, GridFS, Python service client).                                                                                                                                                                                                                                                                                                                          |
| `models/`           | Mongoose schemas and indexes.                                                                                                                                                                                                                                                                                                                                                                                    |
| `errors/`           | Error classes that the error middleware maps to HTTP status codes.                                                                                                                                                                                                                                                                                                                                               |
| `middlewares/`      | Express middleware (error handler).                                                                                                                                                                                                                                                                                                                                                                              |
| `utils/`            | Small helpers.                                                                                                                                                                                                                                                                                                                                                                                                   |

## Request flow

`app.ts` -> generated `build/routes.ts` (tsoa: auth via `authentication.ts`, request
validation, multer for uploads) -> controller -> service -> Mongoose model / GridFS / Python
service. Thrown errors end up in `middlewares/error.middleware.ts`.

## Gotchas

- `build/` (routes + `swagger.json`) is generated by `tsoa spec-and-routes`; `app.ts` does not
  compile before the first `npm run build`.
- `App` does not connect to MongoDB in its constructor. Tests use `new App().express` with their
  own connection; only `start()` connects and registers the signal handlers.
- Types shared with the frontend are imported from `../../../common/types` (relative paths, no alias).
