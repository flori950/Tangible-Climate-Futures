# src/models

Mongoose schemas (Mongoose 9) for the two collections. The TypeScript interfaces are shared with
the frontend in `common/types`.

| File                | Model      | Collection  | Notes                                                                                                                                                                                                                                                  |
| ------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `datafile.model.ts` | `Datafile` | `datafiles` | `title`, `description`, `tags`, `dataType` (enum `DataType`), `dataSet` (enum `SupportedDatasetFileTypes`), `uploadID` (indexed), `content` (`data` as free object, `location` GeoJSON point with a `2dsphere` index, `url`, `mediaType`), timestamps. |
| `journey.model.ts`  | `Journey`  | `journeys`  | `title`, `description`, `tags`, `author`, `parentID`, `visibility` (enum `Visibility`), `collections` (free objects), `excludedIDs`, timestamps, internal `ownerUID` (`select: false`, indexed).                                                       |

## Gotchas

- `content.location.coordinates` has `default: undefined`, so datafiles without coordinates get
  no `location` at all (instead of an empty `{ coordinates: [] }`).
- The `2dsphere` index rejects invalid GeoJSON on insert (the API answers 400). On an existing
  database that already contains invalid locations the index cannot be built; Mongoose logs the
  error and the geo filters still work, only without the index.
- `ownerUID` is deliberately not part of the shared `Journey` type: the frontend sends loaded
  journeys back unchanged and tsoa rejects unknown properties (422).
- `content.data` and `collections` are schemaless; validation of their shape happens in tsoa
  (request types), not in Mongoose.
