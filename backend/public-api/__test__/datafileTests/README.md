# **test**/datafileTests

End-to-end tests of `/api/datafile` with supertest against `new App().express` and an in-memory
MongoDB (authentication disabled via `setupEnv.ts`).

| File                           | Covers                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `datafilePost.test.ts`         | `POST /datafile`                                                                                   |
| `datafileGet.test.ts`          | `GET /datafile/{id}` incl. 404                                                                     |
| `datafileGetAll.test.ts`       | Pagination and `onlyMetadata`                                                                      |
| `datafileUpdate.test.ts`       | `PUT /datafile/{id}`                                                                               |
| `datafileDelete.test.ts`       | `DELETE /datafile/{id}`                                                                            |
| `datafileDeleteMany.test.ts`   | `POST /datafile/deleteMany`                                                                        |
| `datafileFromFile.test.ts`     | `/fromFile` (CSV, SimRa) and `/attach` (CSV, TXT, JSON, wrong type) with files from `../testFiles` |
| `datafileNestedValues.test.ts` | `nestedValue` get/put/delete                                                                       |

Fixtures are inserted with the Mongoose model (`Model.create(fixture as unknown as Datafile)`,
the cast is needed because the fixtures use string literals for enums).
