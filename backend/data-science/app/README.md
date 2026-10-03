# app/

The Flask application package. `create_app(mode, config)` in `__init__.py` is the factory that `main.py` (and the tests) call.

## Files

| File / dir | Purpose |
|---|---|
| `__init__.py` | `create_app` builds the `Flask` app, loads the config class, registers `GET /health`, mounts the flask-restx `Api` (prefix `/api`, Swagger UI at `/docs`), adds the controller namespaces and installs `ErrorHandlerMiddleware(app, api)` |
| `controllers/` | HTTP layer: restx namespace `convert-netcdf-to-json`, form parsing and validation |
| `services/` | conversion logic: NetCDF/CERV2 → JSON |
| `middlewares/` | JSON error handlers for the Flask app and the restx Api |
| `errors/` | domain exceptions that carry their HTTP status |

## Request flow

```
POST /api/convert-netcdf-to-json/<endpoint>
  → controllers (parse form, validate)
  → services (save upload to temp file, open + validate)    ← errors here become 4xx
  → Response(generator) streams JSON                         ← temp file removed when done
```

## Gotchas

- `/health` is a plain Flask route outside restx, and the CI compares its body exactly.
- The `mode` argument of `create_app` is not used; behaviour comes from the config class.
- Controllers are imported inside `add_api_routes` and register on the `Api` created there. There is one `Api` per app.
