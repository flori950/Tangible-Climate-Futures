# src/config

| File        | Purpose                                                                                                                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts` | Default export with all runtime settings, read once from `process.env` at import time: `MONGODB_URL`, `PORT`, `HOST`, `DISABLE_SWAGGER_AUTH`, `DATASCIENCE_BASE_URL` (built from `PYTHON_BACKEND_HOST`/`PYTHON_BACKEND_PORT`), `FIREBASE_PROJECT_ID`. Also exports `parseBooleanFlag()`. |

Defaults and meaning of every variable are listed in the [main README](../../README.md#configuration).

## Gotchas

- Values are captured when the module is first imported. Tests that need different values set
  `process.env` before importing (see `__test__/setupEnv.ts`) or use `jest.isolateModules`.
- `DISABLE_SWAGGER_AUTH` is only `true` for the literal string `true` (case-insensitive). An unset
  variable keeps authentication **on**.
- No `.env` loader is used. docker compose injects the variables from the repository-root `.env`;
  for a local `npm start` export them in the shell.
