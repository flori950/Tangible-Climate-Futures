# src/app

Root of the Angular application: the root module, routing, app-wide services and the feature folders.

## Files

| File                      | Purpose                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.module.ts`           | Root `AppModule`. Declares `AppComponent`, `ViewDatasetsComponent`, `BrowseJourneyComponent`; imports all feature modules; provides `HttpClient` (with DI interceptors), ngx-translate (`provideTranslateService`, JSON files from `assets/i18n/`, fallback `de`) and Firebase (`provideFirebaseApp`/`provideAuth` with `environment.firebase`). |
| `app-routing.module.ts`   | Top-level routes (table below). Uses AngularFire's `AuthGuard`. Preloads all lazy modules.                                                                                                                                                                                                                                                       |
| `app.component.*`         | Shell: `<app-top-menu>` header + `<router-outlet>`; forwards language changes to `TranslateService.use()`.                                                                                                                                                                                                                                       |
| `material.module.ts`      | Re-exports the Angular Material / CDK modules used across the app (imported by every feature module).                                                                                                                                                                                                                                            |
| `notification.service.ts` | `showInfo(text)` shows a 3 s `MatSnackBar` with an "Okay" action.                                                                                                                                                                                                                                                                                |
| `download.service.ts`     | Client-side JSON downloads: `downloadAsJSON(data, name)` (blob URL + temporary `<a download>`), `downloadJourney(journey, excludedIds?)` fetches every collection via `ApiService.filterDatafiles` and downloads the result without excluded data files.                                                                                         |

## Routes

| Path                                        | Component / module                                        | Guard                          |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| `dashboard`                                 | `DashboardModule` (lazy)                                  | logged in, else → `auth/login` |
| `auth/...`                                  | `AuthModule` (lazy)                                       | logged out, else → `dashboard` |
| `journey`, `journey/:id`                    | `JourneyModule` (lazy)                                    | –                              |
| `upload`, `upload-data`                     | `UploadDataComponent`                                     | –                              |
| `upload-data/{no-file,json,csv,txt,netcdf}` | `NoFileUploadComponent` / `RawDatasetsUploadComponent`    | –                              |
| `upload-dataset/{simra,cerv2,csv}`          | `SupportedDatasetsUploadComponent`                        | –                              |
| `data-sets`, `data-sets/:data-set-id`       | `ViewDatasetsComponent`, edit via `NoFileUploadComponent` | –                              |
| `browse-journeys`                           | `BrowseJourneyComponent`                                  | –                              |
| `map`                                       | `MapComponent` (stand-alone map page)                     | –                              |
| `**`                                        | redirect to `/dashboard`                                  |                                |

## Gotchas

- `DashboardModule` and `JourneyModule` are imported eagerly in `AppModule` _and_ lazy-loaded by the router (historic; works, but enlarges the initial bundle).
- The upload/view routes are not guarded; the backend decides via the bearer token added by `shared/interceptors/auth.interceptor.ts`.
- `AppModule` must import `../environments/environment` (the build swaps in `environment.development.ts` for `ng serve`).
