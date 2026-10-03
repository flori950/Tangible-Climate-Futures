# auth/login

`LoginComponent` (`/auth/login`): email + password form. `login()` calls `AuthService.login()` and navigates to `/dashboard` on success; errors are shown by `AuthService` as snack bar. Links to `/auth/register` and `/auth/reset-password`.

Files: `login.component.{ts,html,scss}`, `login.component.spec.ts` (navigation on success/failure).
