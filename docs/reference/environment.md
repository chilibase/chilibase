# Environment variables

Frontend variables are Vite env (`VITE_…`). Backend variables are Nest/`.env` (`X_…`). Auth modes on both sides must match.

## Frontend (`@chilibase/frontend/env-vars`)

Enum `XEnvVar` (re-export of `EnvVar`) and `ViteAuth`.

| Variable | Role |
| --- | --- |
| `VITE_BACKEND_URL` | Backend origin used by the client |
| `VITE_AUTH` | `OFF` / `LOCAL` / `AUTH0` / `MS_ENTRA_ID` |
| `VITE_AUTH_OFF_USERNAME` | Username in `x_user` when auth is off |
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 application client id |
| `VITE_AUTH0_AUDIENCE` | API audience |
| `VITE_MS_ENTRA_ID_TENANT_ID` | Entra tenant |
| `VITE_MS_ENTRA_ID_CLIENT_ID` | Entra app registration |
| `VITE_MS_ENTRA_ID_BACKEND_SCOPE` | Scope requested for the API |
| `VITE_LEGACY_OBJECT_LOADING` | When true, forms without `createObject` / `assocList` still load the old way |

## Backend (`@chilibase/backend/env-vars`)

Enums `EnvVar`, `Auth`, `Protocol`.

| Variable | Role |
| --- | --- |
| `X_PROTOCOL` | `HTTP` or `HTTPS` |
| `X_DOMAIN` | Public host name |
| `X_PORT` | Port |
| `X_AUTH` | Same values as `VITE_AUTH` |
| `X_AUTH_LOCAL_JWT_SECRET` | HMAC secret for local JWT (required if `LOCAL`) |
| `X_AUTH0_DOMAIN` | Auth0 tenant (JWKS / issuer) |
| `X_AUTH0_AUDIENCE` | JWT audience |
| `X_MS_ENTRA_ID_TENANT_ID` | Entra tenant |
| `X_MS_ENTRA_ID_AUDIENCE` | JWT audience |
| `X_DATABASE_URL` | PostgreSQL connection URL |
| `X_STRING_DB_SEARCH_AI_CI` | String search accent/case behaviour |
| `X_LOG_SQL` | Log SQL (including execution time) |

Missing required variables throw at runtime (`Environment variable … value not found`).
