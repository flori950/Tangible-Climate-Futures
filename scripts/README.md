# scripts/

Developer helper scripts. They are not part of any deployed service.

| Dir | Purpose | Dependencies |
|---|---|---|
| `mongo/` | seed a local MongoDB with fake `datafiles` documents, or wipe them | `pymongo`, `faker` (`requirements.txt`) |
| `evaluation/` | benchmark a curl command against the running stack (`curl_benchmark.py`), plus the 2023 results (`benchmarks/`) and sample input files (`data/`) | stdlib + `curl` |

## Setup

```bash
cd scripts
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

`.venv/` is ignored by `scripts/.gitignore`. Tested with Python 3.13, pymongo 4.18 and Faker 40.

## Gotchas

- The scripts in `mongo/` import each other by plain module name (`from utils import …`), so run them from inside `scripts/mongo/`.
- `evaluation/data/` holds a ~60 MB CERV2 NetCDF file (`CERv2_d02km_d_3d_soil_tslb_2022.nc`: `lon`/`lat` plus `tslb[time=365, soil=4, south_north=140, west_east=140]`) and a SIMRA CSV. Both are handy for manual tests of `backend/data-science`.
