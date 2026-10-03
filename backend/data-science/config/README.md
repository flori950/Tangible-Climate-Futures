# config/

Flask configuration classes, selected by the `STAGE` environment variable in `main.py`.

## Files

- `app_config.py`
  - `Config` (base, `DEBUG = False`), `DevelopmentConfig` (`DEBUG = True`), `ProductionConfig`
  - `get_flask_config(mode)` returns the **class** for `development` / `production`. Any other value falls back to `DevelopmentConfig`.

## How it connects

`main.py`: `create_app(mode, get_flask_config(mode))` → `app.config.from_object(config)`. The Dockerfile sets `STAGE=production`.

## Gotchas

- A typo in `STAGE` silently enables debug mode, because of the fallback.
- With `DEBUG = True`, Flask pretty-prints JSON and restx lets exceptions propagate. The custom error handlers still answer, but the exact-match `/health` check in CI expects production mode.
- The CERV2 chunk size is not set here. Clients choose it per request through `step_size` (the old README claimed otherwise).
