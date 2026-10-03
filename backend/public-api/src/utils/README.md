# src/utils

| File       | Purpose                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils.ts` | `parsePath("a.b[0]") -> "a.b.0"` (used for nested-value paths); `toPointLocation(lon, lat)` builds a GeoJSON point or returns `undefined` for missing/non-numeric values (used by the CSV and SimRa parsers). |
