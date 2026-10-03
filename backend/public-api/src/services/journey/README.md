# src/services/journey

| File                 | Purpose                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journey.service.ts` | `JourneyService extends CrudService` for the `Journey` model. Adds `getFiltered(filterSet, skip, limit)`: same filter pipeline as datafiles (see `../filter`), `totalCount` is counted before pagination. |

Used by `controllers/journey.controller.ts`.

## Gotchas

- Visibility (`PUBLIC`/`PRIVATE`) and `author` are stored but not enforced; every authenticated
  user sees and can change all journeys.
