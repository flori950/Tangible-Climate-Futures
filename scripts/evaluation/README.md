# scripts/evaluation/

Performance measurements from 2023. `curl_benchmark.py` runs a curl command N times (optionally in parallel) and logs the mean, min, max and standard deviation of the duration.

```bash
python3 curl_benchmark.py --requests 10 --parallel 1 --curl_command \
  "curl -X POST http://localhost:40000/api/datafile/fromFile -F 'file=@data/CERv2_d02km_d_3d_soil_tslb_2022.nc' -F 'dataset=CERV2' -F 'steps=10'"
```

- `benchmarks/`: logs of the 2023 runs (`<endpoint>_<requests>_<parallel>.txt`) against the public API on port 40000
- `data/`: sample inputs (CERV2 NetCDF ~60 MB, SIMRA CSV)

Gotchas: failed requests (non-zero curl exit) are silently skipped, and `statistics.stdev` raises when fewer than 2 requests succeed.
