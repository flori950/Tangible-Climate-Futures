# Tangible Climate Futures – Frontend

Angular single-page app of the _Tangible Climate Futures_ project (TU Berlin, ADSP SS23, together with UdK Berlin). Users upload climate/city data points (files, media links, free text) with a location, browse and filter them, and combine filtered data sets into **Journeys** that can be explored on a map, in a media gallery and in a 3D city model, saved, continued and downloaded.

The app talks to the Express **public-api** backend (`backend/public-api`, default `http://localhost:40000/api`) and uses **Firebase Authentication** (email/password) for login.

## Stack

| Area               | Package(s)                                                           | Version                                      |
| ------------------ | -------------------------------------------------------------------- | -------------------------------------------- |
| Framework          | `@angular/*` (core, router, forms, …)                                | 22.2                                         |
| Build / dev server | `@angular/build` (esbuild **application** builder), `@angular/cli`   | 22.2                                         |
| UI components      | `@angular/material` + `@angular/cdk`                                 | 22.2                                         |
| Layout helpers     | `bootstrap` (CSS only)                                               | 5.3                                          |
| Auth               | `@angular/fire` (→ `firebase` 11.x)                                  | 20.1                                         |
| i18n               | `@ngx-translate/core` + `@ngx-translate/http-loader`                 | 18.0                                         |
| Maps               | `ol` (OpenLayers), tiles from OpenStreetMap, geocoding via Nominatim | 10.10                                        |
| 3D view            | `three` (+ `@types/three`)                                           | 0.186                                        |
| Media / JSON       | `@angular/youtube-player`, `ngx-json-viewer`                         | 22.2 / 3.2                                   |
| Language           | TypeScript                                                           | 6.0                                          |
| Unit tests         | Vitest via `@angular/build:unit-test`, jsdom                         | Vitest 5, jsdom 30                           |
| Lint / format      | ESLint (flat config) + `angular-eslint`, Prettier                    | ESLint 10, angular-eslint 22.5, Prettier 3.9 |

The app is still structured in **NgModules** (one per feature folder); components use `standalone: false` and the default change detection (`ChangeDetectionStrategy.Eager`).

Requires **Node.js** `^22.22.3 || ^24.15.0 || >=26` (Angular 22). The Docker image uses Node 24 LTS.

## Scripts

| Command                | What it does                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm ci`               | Install exact dependencies from `package-lock.json`                     |
| `npm start`            | Dev server on <http://localhost:8080> (development config, live reload) |
| `npm run build`        | Production build → `dist/frontend/browser/`                             |
| `npm run watch`        | Development build in watch mode                                         |
| `npm test`             | Unit tests (Vitest, watch mode in a TTY)                                |
| `npm run test:ci`      | Unit tests once, headless (same as `npm test -- --watch=false`)         |
| `npm run lint`         | `ng lint` (ESLint over `src/**/*.ts` and `src/**/*.html`)               |
| `npm run format`       | Prettier, write changes                                                 |
| `npm run format:check` | Prettier, check only (CI)                                               |

## Running against the backend

1. Start the backend (see the repository root README; e.g. `npm run dev:all` in the root, or only the public-api). It must listen on `localhost:40000` and expose its routes under `/api`.
2. Configure Firebase (below).
3. `npm ci && npm start` in `frontend/`, open <http://localhost:8080>.

The backend address is compiled in from `src/environments/environment*.ts` (`expressBackendHost`, `expressBackendPort`); `ApiService` builds `http://<host>:<port>/api` from it (`BACKEND_API_URL`). `npm start` uses `environment.development.ts`, `npm run build` uses `environment.ts`. The backend has to allow CORS requests from the frontend origin.

Backend endpoints used by the frontend (all relative to `/api`, see `src/app/shared/service/api.service.ts` and the Swagger docs at `localhost:40000/docs`):

| Method         | Path                                                             | Used for                                               |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| GET            | `/datafile/limit=…&skip=…&onlyMetadata=…`                        | Data set list                                          |
| POST           | `/datafile/filter/limit=…&skip=…&onlyMetadata=…`                 | Filtered data set list, journey collections, downloads |
| GET/PUT/DELETE | `/datafile/:id`                                                  | Edit / delete a data file                              |
| POST           | `/datafile`                                                      | Create a data file                                     |
| POST           | `/datafile/:id/attach` (multipart)                               | Attach a raw JSON/CSV/TXT file                         |
| POST           | `/datafile/fromFile` (multipart)                                 | Import a SimRa / CERv2 / CSV dataset                   |
| GET            | `/journey/limit=…&skip=…`, POST `/journey/filter/limit=…&skip=…` | Browse journeys                                        |
| GET/PUT/DELETE | `/journey/:id`, POST `/journey`                                  | Load / save / delete journeys                          |

External services: OpenStreetMap tiles (`tile.openstreetmap.org`) and Nominatim (`nominatim.openstreetmap.org`) for address lookup.

## Firebase configuration

Authentication uses Firebase email/password sign-in. The keys in `src/environments/environment.ts` and `environment.development.ts` are placeholders (`'xxx'`):

1. Create a Firebase project and a **web app** in the Firebase console; enable **Email/Password** under _Authentication → Sign-in method_.
2. Copy the web app config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) into the `firebase` object of both environment files.
3. The backend must verify the same project's ID tokens (configured on the backend side).

The Firebase web API key is not a secret, but do not commit keys of a production project to a public fork. With the placeholder keys the app starts, but the guarded routes (`/dashboard`, `/auth/*`) cannot resolve the auth state, so the start page stays empty; the other routes work.

After login, `AuthInterceptor` adds `Authorization: Bearer <Firebase ID token>` to requests against the backend (and only those).

## Tests, lint, build

```bash
npm run test:ci        # 36 test files, 156 tests (Vitest + jsdom, no browser needed)
npm run lint           # 0 errors (warnings: remaining `any` types, `on*` output names)
npm run format:check
npm run build          # production build, budgets: initial 4 MB warning / 5 MB error
```

Test setup:

- Runner: `@angular/build:unit-test` with Vitest in jsdom (the runner the Angular CLI recommends since v21; Karma/Jasmine were removed). Specs use Vitest globals (`describe`, `it`, `expect`, `vi`).
- `src/test-setup.ts` stubs browser APIs missing in jsdom (`URL.createObjectURL`, `ResizeObserver`, canvas context).
- `src/testing/` contains shared providers (router, `HttpClient` + `HttpTestingController`, `TranslateService` without loader, a mock `AuthService`) so that no test touches Firebase or the network.
- WebGL is not available in jsdom: the Three.js renderer is created lazily and is not exercised by tests.

## Docker

`Dockerfile` (build context: repository root, because the app imports `../common/types`):

1. `node:24-alpine`: `npm ci` and `npm run build`.
2. `nginxinc/nginx-unprivileged:alpine`: serves `dist/frontend/browser` on port 8080 with `nginx.conf` (SPA fallback to `index.html`, so deep links such as `/journey/<id>` work).

```bash
docker build -f frontend/Dockerfile -t tcf-frontend .   # from the repository root
docker run -p 8080:8080 tcf-frontend
```

## Folder map

```
frontend/
├── angular.json            workspace config (application builder, unit-test builder, eslint)
├── eslint.config.js        ESLint flat config (angular-eslint)
├── .prettierrc.json        Prettier config (+ .prettierignore)
├── Dockerfile, nginx.conf  production image
└── src/
    ├── main.ts             bootstraps AppModule (zone.js change detection)
    ├── index.html, styles.scss, theme.scss
    ├── environments/       backend host/port + Firebase config
    ├── assets/             i18n JSON files, 3D city tiles
    ├── util/               pure helpers (filter type guards, colors, hash)
    ├── testing/            shared test providers
    ├── test-setup.ts       Vitest global setup
    └── app/
        ├── app.module.ts, app-routing.module.ts, material.module.ts
        ├── download.service.ts, notification.service.ts
        ├── auth/           login, register, password reset (Firebase)
        ├── dashboard/      start page with navigation tiles
        ├── upload-data/    upload hub + raw file / dataset / no-file uploads
        ├── view-datasets/  paged, filterable table of data files
        ├── browse-journey/ paged, filterable table of journeys
        ├── journey/        journey editor (map, collections, gallery, 3D)
        ├── filter-blocks/  reusable filter editor
        ├── map/            OpenLayers map (location picker / area filters)
        └── shared/         header, tiles, dialogs, data display, file drop, API services
```

Every folder under `src/` has its own `README.md` with the files, inputs/outputs, routes and gotchas.

## Upgrade notes (2026)

Upgraded from Angular 16 step by step through every major (`ng update` 17 → 18 → 19 → 20 → 21 → 22) with each version's migrations, then:

- **Application builder**: `@angular-devkit/build-angular:browser` → `@angular/build:application`; output moved to `dist/frontend/browser`.
- **Control flow / standalone flags**: templates migrated to `@if`/`@for`/`@switch`; components marked `standalone: false` and `ChangeDetectionStrategy.Eager` (keeps the pre-v22 behaviour).
- **ngx-translate 18**: `TranslateModule.forRoot/forChild` → `provideTranslateService()` + `provideTranslateHttpLoader()`; modules import the standalone `TranslatePipe`. `setDefaultLang` → `setFallbackLang`.
- **HTTP**: `HttpClientModule` → `provideHttpClient(withXhr(), withInterceptorsFromDi())`.
- **PrimeNG removed**: it was only used for the file picker (`p-fileUpload`). PrimeNG 22 changed from MIT to the commercial "PrimeUI" license that needs a license key, and PrimeNG 21 (last MIT release) does not support Angular 22. The picker is now `shared/file-drop` (Material button + drag & drop).
- **Removed unused packages**: `chart.js`, `quill`, `fire`, `json-viewer`, `ol-geocoder`, `ol-popup`, `three-orbitcontrols` (OrbitControls come from `three/addons`), `@types/geojson`; the CDN copies of OpenLayers 4, Bootstrap JS and the YouTube iframe API in `index.html` were dropped (bundled versions are used).
- `tsconfig`: `moduleResolution: bundler`, no `baseUrl` (deprecated in TS 6); `src/...` absolute imports became relative.
- `AppModule` now uses `environments/environment.ts` (it imported `environment.development.ts` directly, so production builds used the development config).

Bug fixes made along the way are listed in the folder READMEs (e.g. YouTube ID parsing, deleting the last collection, auth token sent to Nominatim).

## Known issues

- **AngularFire lags behind Angular.** The latest stable `@angular/fire` (20.1.0) declares peer dependencies on Angular `^20`. `package.json` contains npm `overrides` that let it use Angular 22; build and tests pass, but this combination is not officially supported. Because AngularFire pins `firebase` `^11.8`, the Firebase SDK stays at 11.x (12.x is current) until an AngularFire release for Angular 22 is available (21.0.0 is in RC).
- **Material theme**: the legacy prebuilt `deeppurple-amber.css` theme is still used; a Material 3 theme (`mat.theme()`) would be the modern option.
- **Firebase placeholder keys**: see above; `/` redirects to the guarded `/dashboard`, which stays empty without valid keys.
- **Eager + lazy modules**: `AppModule` imports `DashboardModule` and `JourneyModule` eagerly although they are also lazy-loaded routes (pre-existing; harmless but adds to the initial bundle).
- **Not covered by unit tests**: the WebGL rendering of `journey/threejs-view` and the canvas rendering of OpenLayers (jsdom has neither). Both were smoke-tested in Chrome against the production build.
- **Remaining lint warnings** (no errors): `@typescript-eslint/no-explicit-any` in older code and `@angular-eslint/no-output-on-prefix` for the `onSearch`/`onChange` outputs of `filter-blocks`.
- **npm 11** prints `install-scripts` warnings (esbuild, lmdb, …); the builds do not need those scripts.
- The Docker image could not be built locally during the upgrade (no Docker available); the Dockerfile follows the verified local build. The root `.dockerignore` does not exclude `frontend/.angular/` (Angular cache), so the build context can get large.
