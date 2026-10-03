# src/errors

Plain `Error` subclasses. Services throw them, `middlewares/error.middleware.ts` turns them into
HTTP responses.

| File                             | Class                        | HTTP status                                           |
| -------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `notFound.error.ts`              | `NotFoundError`              | 404                                                   |
| `operationNotSupported.error.ts` | `OperationNotSupportedError` | 400                                                   |
| `wrongObjectType.error.ts`       | `WrongObjectTypeError`       | 400                                                   |
| `failedToParse.error.ts`         | `FailedToParseError`         | 400                                                   |
| `unauthorized.error.ts`          | `UnauthorizedError`          | 401 (fixed message, the error message is not exposed) |
| `forbidden.error.ts`             | `ForbiddenError`             | 403                                                   |
| `payloadTooLarge.error.ts`       | `PayloadTooLargeError`       | 413                                                   |
| `index.ts`                       | Re-exports all classes       |                                                       |

## Gotchas

- The middleware matches with `instanceof`. A class loaded twice (e.g. inside
  `jest.isolateModules`) is a different class; compare by name in such tests.
- The error message is sent to the client (except for 401), so do not put internal details into it.
