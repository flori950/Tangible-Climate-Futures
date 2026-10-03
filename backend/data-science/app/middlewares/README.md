# app/middlewares/

Error handling that gives every route the same JSON error body: `{"error": "<reason>", "message": "<text>"}`.

## Files

- `error_middleware.py`
  - `error_payload(e)` → `(body, status)`. A `DataScienceError` uses its own `status_code`, `error` and `public_message`. Any other exception is logged and reported as 500 `An unexpected error occurred`, so internal details stay out of the response.
  - `ErrorHandlerMiddleware(app, api=None)` registers:
    - on the **Flask app**: `errorhandler(Exception)`. HTTP errors (404, 405, …) keep their status, everything else goes through `error_payload`.
    - on the **restx `Api`**: a handler for `DataScienceError` and a default handler for other non-HTTP exceptions.
  - It is also a WSGI callable (`__call__` delegates to the app), although `create_app` does not wrap the app with it.

## Why both registrations

flask-restx handles exceptions from its own resources in `Api.handle_error` before Flask's handlers run. When exceptions do not propagate (production, `DEBUG=False`), the app-level handlers never saw errors from `/api/...` routes, so restx answered `{"message": "Internal Server Error"}` with status 500 for everything. The restx registration fixes that.

## Gotchas

- HTTP exceptions raised inside restx resources, such as parser validation 400s, keep the restx format `{"message": ...}` / `{"errors": ...}`.
- A catch-all `errorhandler(Exception)` also catches `HTTPException`. Without the pass-through, unknown URLs returned 500 instead of 404, which was the old behaviour.
