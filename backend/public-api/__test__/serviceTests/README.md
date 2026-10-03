# **test**/serviceTests

Tests that call the services directly against an in-memory MongoDB, for logic the HTTP tests do
not reach.

| File                           | Covers                                                                                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crudJourneyService.test.ts`   | `CrudService` (create/get/getAll pagination/update/delete/deleteMany, `NotFoundError`) and `getFiltered` (counting, pagination, concatenation, unsupported operations).                                                 |
| `journeyOwnership.test.ts`     | Ownership rules of `JourneyService`: hidden owner, PRIVATE visibility, 403 for other users, ownerless journeys, auth disabled.                                                                                          |
| `journeyOwnershipHttp.test.ts` | The same over HTTP with authentication enabled (`config` and firebase-admin mocked, the bearer token is used as UID), incl. the frontend's update round trip and 422 for a client-supplied `ownerUID`.                  |
| `datafileService.test.ts`      | Nested values, CSV/SimRa/CERv2 dataset uploads, `attachFile` with NETCDF + GridFS round trip, bucket replacement, parse errors, HTTP validation (malformed ObjectId 422, invalid `_id` filter 400, malformed JSON 400). |
| `datafileHardening.test.ts`    | GridFS cleanup on delete/deleteMany/re-attach, writable nested paths, all-or-nothing nested updates, literal `CONTAINS`, page-size cap, `2dsphere` index and 400 for invalid locations, CERv2 response, `/ready`.       |

The Python service is never called: `NetcdfApi` methods are replaced with `jest.spyOn`.
