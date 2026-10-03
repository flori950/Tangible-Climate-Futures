# src/middlewares

| File                  | Purpose                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `error.middleware.ts` | Express error handler, registered last in `app.ts`. Maps tsoa `ValidateError` (422), the classes from `src/errors` (400/401/404), Mongoose errors (500), `SyntaxError` from malformed JSON bodies (400), any other `Error` (500) and non-`Error` throwables (500) to JSON responses `{ message, details? }`. |

## Gotchas

- Express 5 forwards rejected promises of async handlers automatically; the generated tsoa
  routes also pass errors to `next(err)`, so services can simply `throw`.
- If headers were already sent, the error is passed on to Express' default handler (`next(err)`),
  which closes the connection.
- Validation and unexpected errors are logged with `console.warn`.
