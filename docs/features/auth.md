# Authentication

Frontend and backend must use the **same** mode. Frontend reads `VITE_AUTH`; backend reads `X_AUTH`. Values: `OFF`, `LOCAL`, `AUTH0`, `MS_ENTRA_ID`.

The root `App` component (`@chilibase/frontend/auth`) picks the provider:

```tsx
import { App } from '@chilibase/frontend/auth'

<App>
  {/* router / layout */}
</App>
```

After login, the client calls `x-post-login` to verify that the user exists in `x_user` (and is enabled). Entity metadata is loaded in the same startup path. If the user is missing or disabled, `UserNotFoundOrDisabledError` is raised.

Backend JWT is validated by `JwtStrategy` (`passport-jwt`). `JwtAuthGuard` protects controllers; `@Public()` skips the guard (used on `x-local-auth-login`).

## Auth off (`OFF`)

No real login. Useful for local development. Frontend still runs a post-login / metadata sequence. `VITE_AUTH_OFF_USERNAME` selects which `x_user` row to use. Backend JWT strategy is not applied (do not register `APP_GUARD` in this mode).

## Local (`LOCAL`)

Username and password stored on `x_user` (password hashed with bcrypt, column length 60). Frontend: `AuthLocalProvider` + login form. Backend: `LocalStrategy` + `x-local-auth-login` returns a JWT signed with `X_AUTH_LOCAL_JWT_SECRET`.

Access token expiry is **180 minutes**. Refresh tokens are **not** implemented yet.

Saving users must go through `x-user-save-row` so the password is hashed. Empty password on update means “leave unchanged”.

`ChangePasswordForm` calls `x-local-auth-change-password`.

## Auth0 (`AUTH0`)

Social / hosted login via [Auth0](https://auth0.com). Frontend uses `@auth0/auth0-react`. Backend validates the JWT with Auth0 JWKS (`RS256`), `audience` and `issuer` from env.

Needed env (see [Environment variables](/reference/environment)):

- Frontend: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
- Backend: `X_AUTH0_DOMAIN`, `X_AUTH0_AUDIENCE`

The Auth0 user still needs a matching enabled row in `x_user` (username typically the email).

## Microsoft Entra ID (`MS_ENTRA_ID`)

Formerly Azure AD. Frontend: `@azure/msal-browser` / `@azure/msal-react`. Backend: JWKS from `login.microsoftonline.com/{tenant}/discovery/v2.0/keys`.

Needed env:

- Frontend: `VITE_MS_ENTRA_ID_TENANT_ID`, `VITE_MS_ENTRA_ID_CLIENT_ID`, `VITE_MS_ENTRA_ID_BACKEND_SCOPE`
- Backend: `X_MS_ENTRA_ID_TENANT_ID`, `X_MS_ENTRA_ID_AUDIENCE`

Same rule: user must exist and be enabled in `x_user`.

## Users in the UI

`UserBrowse` / `UserForm` (`@chilibase/frontend/administration`) maintain `x_user`. The current user cannot delete themselves or change their own username / enabled / admin flags.
