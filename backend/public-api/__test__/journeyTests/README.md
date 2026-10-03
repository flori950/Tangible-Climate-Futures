# **test**/journeyTests

HTTP tests of the journey CRUD endpoints (`/api/journey`) with an in-memory MongoDB.

| File                        | Covers                                                 |
| --------------------------- | ------------------------------------------------------ |
| `journeyPost.test.ts`       | `POST /journey`                                        |
| `journeyGet.test.ts`        | `GET /journey/{id}` (incl. 404) and the paginated list |
| `journeyPut.test.ts`        | `PUT /journey/{id}` (incl. 404)                        |
| `journeyDelete.test.ts`     | `DELETE /journey/{id}` (incl. 404)                     |
| `journeyDeleteMany.test.ts` | `POST /journey/deleteMany` (existing and unknown IDs)  |

Unknown IDs are generated with `mongoose.Types.ObjectId.createFromTime(n)` (bson 7 no longer
accepts numbers in the `ObjectId` constructor).
