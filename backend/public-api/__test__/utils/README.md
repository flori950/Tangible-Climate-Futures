# **test**/utils

| File          | Purpose                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database.ts` | `connectTestDatabase()` starts a mongodb-memory-server and connects Mongoose (passing `runtimeAdapters: { os }`, required by MongoDB driver 7 inside Jest); `disconnectTestDatabase()` stops both. |
| `helpers.ts`  | `compareSingleJson(expected, actual)` (recursive, `expected` may be a subset of `actual`) and `checkArrayContainsObjects(expected[], actual[])` (same length, every expected object found).        |
