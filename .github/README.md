# .github/

| Path | What |
|---|---|
| `workflows/` | GitHub Actions. See the table below. |
| `scripts/health_check.sh` | Polls `$ROUTE` up to 3 times (5 s apart) and passes only if the response body is exactly `{"status":"healthy"}`. Used against the public API (`:40000/health`) and the Python service (`:50000/health`). |

## Workflows

| File | Trigger | Does |
|---|---|---|
| `workflows/frontend-ci-tests.yaml` | push/PR to `main` | Node 24: `npm ci`, Prettier check, angular-eslint, Vitest unit tests (jsdom), production build. |
| `workflows/backend-ci-tests.yaml` | push/PR to `main` | Node 24: `npm ci`, build (tsoa + tsc), Prettier check, ESLint, typecheck incl. tests, Jest (in-memory MongoDB). |
| `workflows/python-ci-tests.yaml` | push/PR to `main` | Python 3.13: `pip install -r requirements-dev.txt`, ruff lint + format check, pytest with coverage. |
| `workflows/terraform-ci.yaml` | push/PR to `main` | Terraform 1.16 in `deploy/`: `fmt -check`, `init -backend=false`, `validate`, TFLint (recommended + Google ruleset), `terraform test` (plan-only, mocked providers, no GCP credentials). |
| `workflows/docker-compose-tests.yaml` | push/PR to `main` | `docker compose up -d --build --wait`, health checks against both backends, `docker compose down -v`. |

Update this table whenever a workflow is added or changed.
