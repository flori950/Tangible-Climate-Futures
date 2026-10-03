# common/

Code shared between the Angular frontend and the Express public API. Today it only holds TypeScript types.

| Path | What |
|---|---|
| `types/` | Domain types for datafiles, filters, journeys, pagination and supported file types. See `types/README.md`. |

## How it is consumed

- **Frontend:** path alias `@common/types` → `../common/types` in `frontend/tsconfig.json`.
- **Public API:** imported by relative path. Because of that, `tsc` compiles `common/` together with the API, which is why the compiled entry point lives under `dist/backend/public-api/src/`.
- **tsoa** reads these types to generate the OpenAPI spec. JSDoc tags such as `@pattern` and `@example` (see `mongooseObjectId.ts`) end up in Swagger and in tsoa's request validation.

## Rules

- Keep changes backward compatible for both consumers. Renaming or removing an exported type breaks the frontend build and the generated API routes at the same time.
- No runtime dependencies here: only `type`/`interface`/`enum` declarations, so both bundlers can tree-shake it.
