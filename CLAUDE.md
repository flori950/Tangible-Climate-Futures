# CLAUDE.md

Guidance for Claude Code in this repository.

## What this is

Florian Jäger's fork of the TU Berlin ADSP SS23 team project *Tangible Climate Futures* (upstream `Corgam/SS23_ADSP_TCF`). Three services plus shared types; Florian's original 2023 part was the Angular frontend. Modernised in October 2026. Start with the root `README.md`, then the README of the part you work in: **every meaningful directory has a `README.md`** describing its files, inputs/outputs and gotchas. Read the folder README before editing code in that folder, and update it in the same change when behaviour, files or endpoints change.

## Layout

| Path | Part | Check before committing (run inside the folder) |
|---|---|---|
| `frontend/` | Angular 22 SPA, NgModules, Vitest via `ng test` | `npm run format:check && npm run lint && npm run test:ci && npm run build` |
| `backend/public-api/` | Express 5 + tsoa 6.6 + Mongoose 9, Jest 30 with mongodb-memory-server | `npm run build && npm run format && npm run lint && npm run typecheck && npm test` |
| `backend/data-science/` | Flask 3 NetCDF/CERV2 → JSON service, pytest + ruff | `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/python -m pytest` |
| `common/types/` | Types shared by frontend (`@common/types`) and API (relative import, also feeds tsoa/Swagger) | build + tests of **both** frontend and API |
| `scripts/` | Mongo seed/cleanup, evaluation | `--help` runs |
| `deploy/` | Terraform, GCE VM | not runnable here (no Terraform installed) |
| `.github/workflows/` | one CI workflow per part + Docker Compose health check | keep `.github/README.md` table in sync |

Root shortcuts: `npm test`, `npm run test:frontend|test:backend|test:python`, `npm run lint`, `npm run setup`.

## Environment facts

- Use **Node 24** for the public API (firebase-admin breaks on Node ≥ 25). Frontend tests and builds also work on Node 26.
- Python venv lives in `backend/data-science/.venv` (created by `npm run setup:python`); pipenv is optional.
- No Docker and no Terraform on Florian's Mac: Dockerfiles, compose files and Terraform can only be checked by CI.
- The root `.env` is committed with **placeholders** for production values. Never put real credentials into it.

## Conventions

- **Commits are always in Florian's name** (repo identity `flori950`), German one-line messages in the style of the existing history (e.g. „Public API auf Express 5 … aktualisiert“). No `Co-Authored-By: Claude` trailer, no mention of Claude.
- Keep the frontend on NgModules unless a migration is the explicit task; the lint config disables prefer-standalone/on-push/inject on purpose.
- Changes to `common/types` must stay backward compatible for both consumers.
- PrimeNG was removed on purpose (commercial licence from v22); do not reintroduce it.
- Prettier formats TS/HTML/SCSS in frontend and API, ruff formats Python. Do formatting-only changes in separate commits.

## Known gaps worth knowing before feature work

No authorisation model (any signed-in user can edit everything), open CORS, no upload size limit, unescaped regex in `CONTAINS` filters, AngularFire only via npm `overrides`, CERV2 uploads respond with `[]`, Python service loads selected variables fully into memory. Details in the part READMEs under "Known issues".
