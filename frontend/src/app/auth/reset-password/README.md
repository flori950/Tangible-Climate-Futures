# auth/reset-password

`ResetPasswordComponent` (`/auth/reset-password`): asks for the email address, calls `AuthService.resetPassword()` (Firebase sends the reset mail) and returns to `/auth/login` on success.

Files: `reset-password.component.{ts,html,scss}`, `reset-password.component.spec.ts`.
