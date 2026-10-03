# shared/interceptors

`AuthInterceptor` (class-based `HttpInterceptor`, registered via `HTTP_INTERCEPTORS` in `SharedModule`, active because `AppModule` uses `withInterceptorsFromDi()`).

For requests whose URL starts with `BACKEND_API_URL` it takes the current Firebase ID token (`idToken(auth)`, first value) and adds `Authorization: Bearer <token>`; anonymous users' requests are sent unchanged.

Gotcha: all other requests (translation files, Nominatim, …) are passed through without waiting for Firebase. Before, every request waited for the token and the token was also sent to `nominatim.openstreetmap.org`.
