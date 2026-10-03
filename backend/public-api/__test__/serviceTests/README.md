# **test**/serviceTests

Tests that call the services directly against an in-memory MongoDB, for logic the HTTP tests do
not reach.

| File                         | Covers                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crudJourneyService.test.ts` | `CrudService` (create/get/getAll pagination/update/delete/deleteMany, `NotFoundError`) and `JourneyService.getFiltered` (counting, pagination, concatenation, unsupported operations).                                                                                          |
| `datafileService.test.ts`    | Nested values (falsy values, no upsert for unknown IDs), CSV/SimRa/CERv2 dataset uploads, `attachFile` with NETCDF + GridFS round trip, bucket replacement, parse errors, plus HTTP validation (malformed ObjectId -> 422, invalid `_id` filter -> 400, malformed JSON -> 400). |

The Python service is never called: `NetcdfApi` methods are replaced with `jest.spyOn`.
