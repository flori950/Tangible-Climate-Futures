# util

Framework-independent helpers (each with a `*.spec.ts`).

| File              | Content                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filter-utils.ts` | Type guards for the backend filter types from `@common/types`: `isFilter`, `isConcatenationFilter`, `isAreaFilter`, `isRadiusFilter`, `isMapFilter`, `isBooleanFilter`, `isStringFilter`, `isNumberFilter`. |
| `colors.ts`       | Palette of 94 hex colours; collection _n_ of a journey gets `colors[n]`.                                                                                                                                    |
| `hash.ts`         | `hashObj(obj \| string)`: small non-cryptographic 32-bit string hash (JSON of objects).                                                                                                                     |
