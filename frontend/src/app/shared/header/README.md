# shared/header

`<app-top-menu>` (`TopMenuComponent`): Bootstrap navbar at the top of every page.

- Home button (hidden on `/` and `/dashboard`), app title (`title.title`), the logged-in user's email (`AuthService.user$`) and a logout button (`AuthService.logout()`).
- Language menu (`de`, `en`): `switchLanguage(lang)` calls `TranslateService.use()`, stores the choice in `localStorage['language']` and emits `@Output() languageChanged`. On start the stored language (default `de`) is used and `de` is set as fallback.

Original author: Florian Jäger (created with the map in TCF-5, PR #66; translation switch PR #79; header styling PR #81).

Files: `top-menu.component.{ts,html}`, `top-menu.scss`, `top-menu.component.spec.ts`. The selector was renamed from `top-menu` to `app-top-menu` (lint prefix rule).
