# Architecture

Chilibase is two libraries plus your app.

```
┌─────────────────────────────────────────┐
│  App frontend (Vite + React)            │
│  @chilibase/frontend                    │
│  PrimeReact, React Router               │
└──────────────────┬──────────────────────┘
                   │ HTTP JSON (JWT)
┌──────────────────▼──────────────────────┐
│  App backend (NestJS)                   │
│  ChilibaseModule.forRoot()              │
│  @chilibase/backend                     │
│  TypeORM + PostgreSQL                   │
└─────────────────────────────────────────┘
```

Both packages compile to **ESM**. Apps are typically deployed on a Linux VPS with Docker; GitHub Actions is used in existing projects.

## Frontend

`@chilibase/frontend` is a React component library. Imports are per area, for example:

```ts
import { LazyDataTable, Column } from '@chilibase/frontend/lazy-data-table'
import { FormBaseModif, FormFooter, FormHeader } from '@chilibase/frontend/form'
import { TextField } from '@chilibase/frontend/text-field'
import { App } from '@chilibase/frontend/auth'
```

The root `App` component selects the auth provider from `VITE_AUTH` (off / local / Auth0 / Microsoft Entra ID) and wraps the rest of the UI.

`MenuBar` renders a PrimeReact menubar and shows the current user (and backend URL on desktop).

## Backend

Register the framework module in your Nest application:

```ts
ChilibaseModule.forRoot()
```

That module brings in:

- `AuthModule` (JWT / local login)
- `PersistenceController` — find, save, remove, export, metadata, local login
- `FileController` — upload / download
- Services: persistence, lazy table, export (Excel / CSV / JSON), files, entity metadata, browse metadata

Your `AppModule` still owns TypeORM `DataSource` configuration, entity list, and the JWT `APP_GUARD` when auth is not `OFF`.

## Persistence API (selected)

All of these are `POST` endpoints on the backend:

| Endpoint | Purpose |
| --- | --- |
| `x-lazy-data-table-find-rows` | Paged, filtered, sorted rows |
| `x-lazy-data-table-export-excel` / `-csv` / `-json` | Export current query |
| `x-lazy-auto-complete-suggestions` | Autocomplete search |
| `x-find-row-by-id` | Load one row (optional lock) |
| `x-save-row` | Insert or update, including cascaded details |
| `x-remove-row` | Delete |
| `x-unlock-row` | Release pessimistic lock |
| `x-get-entity-metadata-map` | Field / association metadata for the UI |
| `x-get-browse-meta-map` | Stored browse column layout |
| `x-local-auth-login` | Local login (`@Public`) |
| `x-post-login` | After login: resolve user in DB |
| `x-user-save-row` | Save user (hashes password for local auth) |
| `x-upload-file-into-file-system` / `x-upload-file-into-db` | File upload |

## Metadata

On startup (after login), the frontend loads the entity map from `x-get-entity-metadata-map`. That map is derived from TypeORM metadata: entity name, id field, scalar fields, and associations (type, cascade, nullability).

Browse column layouts can be stored in `x_browse_meta` / `x_column_meta` and edited at runtime (`DynamicBrowse`).

## Stack

| Layer | Libraries |
| --- | --- |
| UI | React 18, PrimeReact 10, PrimeFlex, PrimeIcons, React Router 7 |
| Forms extras | Quill (rich text) |
| Auth clients | `@auth0/auth0-react`, `@azure/msal-browser` / `@azure/msal-react` |
| API | NestJS 11, Passport JWT |
| ORM / DB | TypeORM 0.3, `pg`, PostgreSQL |
| Export | exceljs |
| Tooling | Vite, TypeScript, pnpm, ESM |
