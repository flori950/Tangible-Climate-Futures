# scripts/mongo/

A small CLI to fill or clear the `datafiles` collection of a local MongoDB. The public API reads that collection.

## Usage

```bash
cd scripts/mongo
../.venv/bin/python main.py seed                       # 10 fake documents
../.venv/bin/python main.py seed -n 500 -u mongodb://localhost:27017/datastore
../.venv/bin/python main.py cleanup                    # delete_many({}) on datafiles
../.venv/bin/python main.py --help
```

`-u/--mongo-url` defaults to `mongodb://localhost:27017/datastore`.

## Files

| File | Purpose |
|---|---|
| `main.py` | argparse CLI: `seed` / `cleanup`, `-u`, `-n` |
| `seedMongo.py` | `generate_fake_data(fake)` builds a `REFERENCED` document (url + mediaType + GeoJSON point) or a `NOTREFERENCED` one (random JSON + point), `dataSet` ∈ NONE/SIMRA/CERV2, always tagged `fake`. `seed_mongo` inserts them one by one |
| `cleanupMongo.py` | `cleanup_mongo` deletes **all** documents in the collection, not only the ones tagged `fake` |
| `utils.py` | `connect_mongo(url)` → `datafiles` collection of the URL's database (fallback `datastore`). `generate_coordinates()` returns a random `[lon, lat]` inside Berlin |

## Gotchas

- `cleanup` empties the whole collection, real uploads included. Never point it at production.
- The document shape copies the public API's `datafile` model as of 2023. If that model changes, update `generate_fake_data`.
- Errors are printed, not raised, so the exit code is 0 even when MongoDB is unreachable.
- Fixed: the database name used to be cut from the URL with `split("/")[3]`. That kept query strings (`datastore?authSource=admin`) and crashed with `IndexError` on URLs without a database. It now uses `MongoClient.get_default_database("datastore")`. The client is also closed after each command.
- `seed` prints the full URL, credentials included, if the URL contains them.
