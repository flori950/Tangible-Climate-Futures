# auth/register

`RegisterComponent` (`/auth/register`): email, password and password repetition. `register()` calls `AuthService.register()` (which rejects mismatching passwords before contacting Firebase) and navigates to `auth/login` on success.

Files: `register.component.{ts,html,scss}`, `register.component.spec.ts`.
