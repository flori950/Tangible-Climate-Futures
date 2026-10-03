# environments

Build-time configuration.

| File                         | Used by                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `environment.ts`             | production build (`npm run build`, Docker image)                             |
| `environment.development.ts` | `npm start` / development configuration (file replacement in `angular.json`) |

Fields:

- `production`: flag (currently not read by the app).
- `expressBackendHost`, `expressBackendPort`: backend address; `ApiService` uses `http://<host>:<port>/api` (default `localhost:40000`).
- `firebase`: Firebase web app config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). The committed values are placeholders (`'xxx'`); see `frontend/README.md` → _Firebase configuration_.

Gotchas: the values are compiled into the bundle (no runtime configuration); the backend URL always uses `http`. Import `environments/environment` (never `environment.development` directly) so the file replacement works.
