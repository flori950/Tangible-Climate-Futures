# src/services/filter

Translate the API filter objects (`common/types/filter.ts`, `filterSet.ts`) into MongoDB
queries. Used by `CrudService.getFiltered` (shared by datafiles and journeys), which puts every
entry of the `filterSet` into its own `$match` stage.

| File                       | Purpose                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `filter.service.ts`        | `createBasicFilterQuery(filter)` dispatches on `operation`; `createConcatenationFilterQuery` builds `$and`/`$or`. Unknown operations throw `OperationNotSupportedError`.                                                                                           |
| `stringFilter.service.ts`  | `CONTAINS` (literal, case-insensitive substring: the value is escaped with `escapeRegExp`, max. `MAX_CONTAINS_LENGTH` = 200 characters) and `MATCHES` (equality). For the key `_id` the value is converted to an ObjectId (invalid IDs -> `WrongObjectTypeError`). |
| `numberFilter.service.ts`  | `EQ`, `GT`, `GTE`, `LT`, `LTE`.                                                                                                                                                                                                                                    |
| `booleanFilter.service.ts` | `IS`.                                                                                                                                                                                                                                                              |
| `geodataFilter.service.ts` | `RADIUS` (`$geoWithin.$centerSphere`, radius in km / 6378.1) and `AREA` (`$geoWithin.$geometry` polygon).                                                                                                                                                          |

`negate: true` wraps the condition in `$not` (or uses `$ne` for `MATCHES` and `_id`).

## Gotchas

- `CONTAINS` does not interpret regular expressions (`a.b` only matches a literal dot).
- `CONTAINS` on `_id` is an exact match, not a substring search.
- Filters run as aggregation `$match` stages, so Mongoose does not cast values; `_id` is the only
  key that is converted.
