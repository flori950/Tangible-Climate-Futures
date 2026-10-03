# src/middlewares

| File                  | Purpose                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `error.middleware.ts` | Express error handler, registered last in `app.ts`. Maps errors to JSON responses `{ message, details? }`. |

| Error                                                                                                      | Status      |
| ---------------------------------------------------------------------------------------------------------- | ----------- |
| tsoa `ValidateError`                                                                                       | 422         |
| `NotFoundError`                                                                                            | 404         |
| `OperationNotSupportedError`, `WrongObjectTypeError`, `FailedToParseError`, `SyntaxError` (malformed JSON) | 400         |
| Multer errors other than file size, invalid GeoJSON (MongoDB code 16755)                                   | 400         |
| `UnauthorizedError`                                                                                        | 401         |
| `ForbiddenError`                                                                                           | 403         |
| `PayloadTooLargeError`, multer `LIMIT_FILE_SIZE`                                                           | 413         |
| 4xx `http-errors` of Express' body parsers (e.g. body too large 413, wrong charset 415)                    | status kept |
| Mongoose errors, any other `Error`, non-`Error` throwables                                                 | 500         |

## Gotchas

- Express 5 forwards rejected promises of async handlers automatically; the generated tsoa
  routes also pass errors to `next(err)`, so services can simply `throw`.
- If headers were already sent, the error is passed on to Express' default handler (`next(err)`),
  which closes the connection.
- Validation and unexpected errors are logged with `console.warn`.
