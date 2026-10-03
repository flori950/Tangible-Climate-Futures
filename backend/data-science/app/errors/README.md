# app/errors/

Domain exceptions. Each class carries the HTTP response it maps to, and `app/middlewares` reads those attributes.

## Files

- `errors.py`

| Class | Status | Default message | Raised when |
|---|---|---|---|
| `DataScienceError` | 500 | `An unexpected error occurred` | base class |
| `FailedToParseError` | 400 | `Error processing the file` | the upload cannot be saved or opened as NetCDF |
| `NoCoordinatesError` | 400 | `Variable does not contain the dimensions …` | a requested CERV2 variable lacks `south_north`/`west_east` |
| `InvalidRequestError` | 400 | `Invalid request parameters` | bad `step_size` or range, or none of the requested variables exists |

Passing a message (`InvalidRequestError("...")`) replaces `public_message`, and that text is sent to the client. Only put safe, user-facing text there.

- `__init__.py` re-exports all four classes.

## Gotchas

`FailedToParseError` used to return **500**. It now returns **400**, because an unreadable upload is a client error. The public API turns any non-2xx response into its own `FailedToParseError`, so its behaviour does not change.
