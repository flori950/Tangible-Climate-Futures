# shared

`SharedModule`: components and services used by several feature modules.

## Contents

| Folder            | Content                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `header/`         | `<app-top-menu>` page header (title, home button, user, logout, language). |
| `dashboard-tile/` | `<app-dashboard-tile>` navigation tile + `Tile` interface.                 |
| `data-display/`   | `<app-data-display>` (media / JSON viewer) and its dialog wrapper.         |
| `file-drop/`      | `<app-file-drop>` file picker with drag & drop.                            |
| `input-dialog/`   | Generic one-field input dialog.                                            |
| `interceptors/`   | `AuthInterceptor` (Firebase ID token → backend requests).                  |
| `service/`        | `ApiService` (backend + Nominatim), `CoordinateService`, `DialogService`.  |

`shared.module.ts` declares/exports the components and provides `CoordinateService`, `ApiService`, `DialogService` and the `HTTP_INTERCEPTORS` entry for `AuthInterceptor`.

## Gotchas

- `SharedModule` is imported by lazy modules too, so `ApiService`/`DialogService` (also `providedIn: 'root'`) and `CoordinateService` may exist as separate instances per lazy module injector. `CoordinateService` broadcasts therefore only reach components of the same injector.
