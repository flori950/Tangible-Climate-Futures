# src/models

Mongoose schemas (Mongoose 9) for the two collections. The TypeScript interfaces are shared with
the frontend in `common/types`.

| File                | Model      | Collection  | Notes                                                                                                                                                                                                                                                     |
| ------------------- | ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `datafile.model.ts` | `Datafile` | `datafiles` | `title`, `description`, `tags`, `dataType` (enum `DataType`), `dataSet` (enum `SupportedDatasetFileTypes`), `uploadID` (indexed), `content` (`data` as free object, `location` GeoJSON point with indexed `coordinates`, `url`, `mediaType`), timestamps. |
| `journey.model.ts`  | `Journey`  | `journeys`  | `title`, `description`, `tags`, `author`, `parentID`, `visibility` (enum `Visibility`), `collections` (free objects), `excludedIDs`, timestamps.                                                                                                          |

## Gotchas

- `content.location.coordinates` has `default: undefined`, so datafiles without coordinates get
  no `location` at all (instead of an empty `{ coordinates: [] }`).
- There is no `2dsphere` index; `RADIUS`/`AREA` filters use `$geoWithin`, which works without
  one but scans the collection.
- `content.data` and `collections` are schemaless; validation of their shape happens in tsoa
  (request types), not in Mongoose.
