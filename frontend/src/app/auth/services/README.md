# auth/services

`AuthService` (`providedIn: 'root'`) wraps AngularFire Auth (`@angular/fire/auth`):

| Member                                      | Behaviour                                                                                                                                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user$`                                     | Observable of the current Firebase `User` (or `null`); used by the header and by `JourneyService` (author of saved journeys).                                                      |
| `login(email, password)`                    | `signInWithEmailAndPassword`; resolves `true`/`false`.                                                                                                                             |
| `register(email, password, repeatPassword)` | Rejects different passwords (`auth/password-mismatch`) before calling `createUserWithEmailAndPassword`.                                                                            |
| `resetPassword(email)`                      | `sendPasswordResetEmail`.                                                                                                                                                          |
| `logout()`                                  | `signOut`, then navigates to `/auth/login`.                                                                                                                                        |
| `handleAuthError(error)`                    | Maps known Firebase error codes to `auth.error.<code>` translations, otherwise `auth.error.unknown`; shows them in a red snack bar (`theme-snackbar-error`, see `src/theme.scss`). |

Tests (`auth.service.spec.ts`) cover the password-mismatch path and the error mapping; Firebase calls themselves are not unit-tested (ES module functions cannot be stubbed with the Angular Vitest builder).
