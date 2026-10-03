# src/services/journey

| File                 | Purpose                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journey.service.ts` | `JourneyService extends CrudService` for the `Journey` model, created per request with the Firebase UID of the user (`new JourneyService(userId)`). Filtering and pagination come from `CrudService`. |

Used by `controllers/journey.controller.ts`.

## Ownership rules (only when a `userId` is given, i.e. authentication is enabled)

- `create` stores the user's UID in the hidden field `ownerUID`.
- `get` / `getAll` / `getFiltered` only return `PUBLIC` journeys, the user's own journeys and
  journeys without owner; other users' `PRIVATE` journeys answer 404.
- `update` / `delete` / `deleteMany` on journeys of other users throw `ForbiddenError` (403).
- Journeys without `ownerUID` (created before these rules or with auth disabled) are open to all.

## Gotchas

- `ownerUID` has `select: false` and is removed from aggregation results (`$unset`). It must
  never reach the client: the frontend sends loaded journeys back on update, and tsoa rejects
  unknown properties with 422.
- `author` is a free-text display name (the frontend uses the e-mail address); it is not used
  for authorisation.
