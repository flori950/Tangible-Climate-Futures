# scripts

| File            | Purpose                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `e2e-local.mjs` | Local end-to-end scenarios against the **compiled** server (`npm run test:e2e` builds first). Starts real processes and checks everything over HTTP, like the frontend or a browser would. |

## Running

```bash
npm run test:e2e                                    # API + MongoDB (73 checks, NetCDF scenarios skipped)
DATASCIENCE_PYTHON=/path/to/venv/bin/python npm run test:e2e   # + real Python service (88 checks)
npx -y node@24 scripts/e2e-local.mjs                # same with Node 24 (as in the Docker image)
```

`DATASCIENCE_PYTHON` must point to a Python that has `backend/data-science/requirements.txt`
installed, e.g.

```bash
python3 -m venv /tmp/tcf-ds && /tmp/tcf-ds/bin/pip install -r ../data-science/requirements.txt
```

The script starts `backend/data-science/main.py` with it (`PYTHONDONTWRITEBYTECODE=1`, nothing
is written into that folder).

## Scenarios

| #   | Configuration                                                 | Checks                                                                                                                                                                                     |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Development (`DISABLE_SWAGGER_AUTH=true`, defaults)           | `/health`, `/ready`, `/docs`, CORS `*`, helmet headers, bypass warning                                                                                                                     |
| 1a  |                                                               | Datafile CRUD, 422 for malformed IDs / unknown or missing properties, 400 for malformed JSON and invalid coordinates, 404, page-size cap, `onlyMetadata`                                   |
| 1b  |                                                               | CSV and SimRa dataset uploads (locations, numbering), unknown dataset, malformed CSV (no hang), attach JSON/CSV/TXT, invalid JSON, attach to REFERENCED                                    |
| 1c  |                                                               | All filter types incl. RADIUS/AREA on real coordinates, literal `CONTAINS`, regex characters, length limit, `AND`/`OR`, `_id`                                                              |
| 1d  |                                                               | Nested values: read, falsy values, forbidden paths, all-or-nothing with an unknown ID, delete                                                                                              |
| 1e  |                                                               | Journeys exactly as the frontend uses them (GET → strip `_id`/timestamps → PUT), list, filter                                                                                              |
| 1f  | real Python service                                           | NetCDF attach (metadata, GridFS storage, `°C` intact, re-read, GridFS cleanup on delete), CERv2 upload of a 4×5 grid (20 datafiles, time series, RADIUS search), Python service down → 400 |
| 1g  |                                                               | SIGTERM → exit 0, data survives restart of API **and** MongoDB (data directory on disk)                                                                                                    |
| 1h  | MongoDB stopped while running                                 | `/ready` 503, `/health` 200, SIGTERM still terminates                                                                                                                                      |
| 2   | `CORS_ORIGINS`, `MAX_UPLOAD_SIZE_MB=1`, `JSON_BODY_LIMIT=1kb` | allowed/denied origins, 2 MB upload 413, 3 kB body 413                                                                                                                                     |
| 3   | Authentication enabled                                        | 401 without token, with an invalid token, with a wrong scheme; `/health` and `/docs` public                                                                                                |
| 4   | Unreachable MongoDB at startup                                | process exits with code 1                                                                                                                                                                  |

Not covered: logging in with a real Firebase account (needs a Firebase project and user). The
ownership rules with valid tokens are tested in
`__test__/serviceTests/journeyOwnershipHttp.test.ts` with firebase-admin mocked.

## Gotchas

- Ports 40400 (API), 40401 and 50400 (Python) must be free; MongoDB uses a random port.
- `mongodb-memory-server` may pick a new port when MongoDB is restarted; the script always uses
  the current URL.
- The MongoDB data directory is a temporary folder that is deleted at the end.
