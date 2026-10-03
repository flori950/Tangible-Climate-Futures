# src/controllers

tsoa controllers. tsoa reads the decorators and JSDoc comments to generate `build/routes.ts`
(Express routes incl. validation) and `build/swagger.json` (OpenAPI 3). `tsoa.json` picks up
every `*.controller.ts` in this folder.

| File                     | Route prefix    | Delegates to                            |
| ------------------------ | --------------- | --------------------------------------- |
| `datafile.controller.ts` | `/api/datafile` | `services/datafile/datafile.service.ts` |
| `journey.controller.ts`  | `/api/journey`  | `services/journey/journey.service.ts`   |

Both classes are decorated with `@Security("firebase")`, so every endpoint goes through
`src/authentication.ts`. The endpoint tables are in the [main README](../../README.md#endpoints).

## Gotchas

- Pagination is encoded in the **path** (`limit={limit}&skip={skip}`), not in the query string.
  Keep this when adding endpoints, the frontend depends on it.
- Request/response types must come from `common/types` with `import type`, so tsoa can resolve
  them for the spec. JSDoc tags such as `@pattern` on those types become validation rules
  (e.g. `MongooseObjectId`).
- `tsoa.json` sets `noImplicitAdditionalProperties: "throw-on-extras"`: unknown body properties
  are rejected with 422.
- File uploads use `@UploadedFile()` + `@FormField()`; the generated routes handle them with
  multer (memory storage, no size limit).
- Controllers are instantiated per request by the generated routes. Do not keep state in them.
- `JourneyController` injects the Express request (`@Request()`, not part of the spec) and
  creates `JourneyService` with the user's UID, which enforces the ownership rules.
- After changing a controller run `npm run build` (or `npx tsoa spec-and-routes`) to regenerate
  routes and spec.
