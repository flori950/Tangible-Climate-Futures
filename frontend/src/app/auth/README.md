# auth

Firebase email/password authentication: login, registration and password reset pages. Lazy-loaded under `/auth` (route guard in `app-routing.module.ts` sends logged-in users to `/dashboard`).

## Files

| File / folder                            | Purpose                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `auth.module.ts`                         | Declares the three page components; imports Material, forms, `TranslatePipe`, `SharedModule`. |
| `auth-routing.module.ts`                 | `login`, `register`, `reset-password` child routes.                                           |
| `login/`, `register/`, `reset-password/` | Page components (see their READMEs).                                                          |
| `services/auth.service.ts`               | Wrapper around AngularFire Auth (see `services/README.md`).                                   |

## Gotchas

- Needs real Firebase keys in `src/environments/`; with the placeholders the guard never resolves and the pages stay empty.
- Error messages come from `auth.error.*` keys in `assets/i18n/*.json`.
