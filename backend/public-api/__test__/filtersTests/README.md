# **test**/filtersTests

HTTP tests of the filter endpoints (`POST /api/datafile/filter/...`, `POST /api/journey/filter/...`)
with fixtures in an in-memory MongoDB.

| File                                   | Covers                                 |
| -------------------------------------- | -------------------------------------- |
| `datafileStringFilters.test.ts`        | `CONTAINS`, `MATCHES` (incl. negation) |
| `datafileNumberFilters.test.ts`        | `EQ`, `GT`, `GTE`, `LT`, `LTE`         |
| `datafileBooleanFilters.test.ts`       | `IS`, `onlyMetadata`                   |
| `datafileGeodataFilters.test.ts`       | `RADIUS`, `AREA` (incl. negation)      |
| `datafileConcatenationFilters.test.ts` | `AND`, `OR`, `AND` + `NOT`             |
| `journeyStringFilter.test.ts`          | `CONTAINS` on journeys                 |

The query building itself is unit-tested in `../unitTests/filterService.test.ts`.
