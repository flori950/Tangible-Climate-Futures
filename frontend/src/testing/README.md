# testing

Helpers for unit tests only (not part of the app bundle).

| File                    | Content                                                                                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test-helpers.ts`       | `commonTestProviders()`: `provideRouter([])`, `provideHttpClient()` + `provideHttpClientTesting()`, `provideTranslateService({ lang: 'en' })` without loader (templates render translation keys). `mockAuthServiceProvider(email?)`: replaces `AuthService` so no test touches Firebase. |
| `app-module-imports.ts` | The NgModule imports `AppModule` gives its own components (`ViewDatasetsComponent`, `BrowseJourneyComponent`), without Firebase and HTTP root providers.                                                                                                                                 |

Global setup for every test file is `src/test-setup.ts` (jsdom stubs), registered as `setupFiles` of the `test` target in `angular.json`. Run the suite with `npm run test:ci`.
