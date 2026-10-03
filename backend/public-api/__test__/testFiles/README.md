# **test**/testFiles

Sample uploads used by `datafileTests/datafileFromFile.test.ts` and
`serviceTests/datafileService.test.ts`.

| File              | Content                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `simra`           | Minimal SimRa ride file: version line, one incident row, separator, data version, two sensor rows (empty `lat`/`lon`).                         |
| `test.csv`        | CSV with a header line and four rows (no coordinates).                                                                                         |
| `test.json`       | JSON object for the `/attach` JSON test.                                                                                                       |
| `sample.nc`       | Small NetCDF file (variable `temperature` with unit `°C`) for NETCDF attach in the e2e scenarios.                                              |
| `cerv2_sample.nc` | CERv2-like NetCDF: 3 time steps on a 4×5 `south_north`/`west_east` grid around Berlin with `lat`, `lon`, `T2`. Used by the e2e CERv2 scenario. |

The two `.nc` files were generated with `netCDF4` (see `scripts/README.md`); they are only read by
`scripts/e2e-local.mjs`, not by Jest.
