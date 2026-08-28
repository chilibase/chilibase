# Packages

Published from this repository (version **0.6.2**):

| Package | Role |
| --- | --- |
| [`@chilibase/frontend`](https://github.com/chilibase/chilibase/tree/main/frontend) | React UI: browse, forms, auth, administration |
| [`@chilibase/backend`](https://github.com/chilibase/chilibase/tree/main/backend) | NestJS: persistence, files, auth, export |

Scaffold: [`create-chilibase`](https://github.com/chilibase/create-chilibase) (`pnpx create-chilibase@0.3.2 …`). Demo app: [`chilibase/car-demo`](https://github.com/chilibase/car-demo).

License: MIT. Author: Michal Rakus.

## Frontend subpath exports

Import from a subpath, not the package root:

```
@chilibase/frontend/common
@chilibase/frontend/app-layout
@chilibase/frontend/auth
@chilibase/frontend/autocomplete-field
@chilibase/frontend/browse
@chilibase/frontend/button
@chilibase/frontend/checkbox-field
@chilibase/frontend/date-field
@chilibase/frontend/select-field
@chilibase/frontend/dynamic-browse
@chilibase/frontend/env-vars
@chilibase/frontend/form
@chilibase/frontend/form-data-table
@chilibase/frontend/form-layout
@chilibase/frontend/form-navigator
@chilibase/frontend/number-field
@chilibase/frontend/input-file-list
@chilibase/frontend/interval-field
@chilibase/frontend/lazy-data-table
@chilibase/frontend/locale
@chilibase/frontend/multi-select-field
@chilibase/frontend/multiline-text-field
@chilibase/frontend/rich-text-field
@chilibase/frontend/search-field
@chilibase/frontend/text-field
@chilibase/frontend/to-one-assoc-button
@chilibase/frontend/use-state
@chilibase/frontend/doc-templates
@chilibase/frontend/administration
@chilibase/frontend/utils
```

**Peer dependencies** (app must provide): `react`, `react-dom`, `react-router`, `primereact`, `primeflex`, `primeicons`, `quill`, `react-transition-group`.

## Backend subpath exports

```
@chilibase/backend/auth
@chilibase/backend/common
@chilibase/backend/env-vars
@chilibase/backend/export
@chilibase/backend/locale
@chilibase/backend/main-module
@chilibase/backend/administration
@chilibase/backend/files
@chilibase/backend/persistence
@chilibase/backend/services
@chilibase/backend/utils
```

Entry module: `ChilibaseModule` from `@chilibase/backend/main-module`.

**Peer dependencies** (app must provide): NestJS (`common`, `core`, `config`, `passport`, `platform-express`, `typeorm`), TypeORM, `pg`, `passport` / `passport-jwt` / `passport-local`, `jwks-rsa`, `exceljs`, `rxjs`, `reflect-metadata`, `postgres-interval`, `pg-query-stream`.

## Deprecated `X…` names

Older names (`XFormBase`, `XLazyDataTable`, `XInputText`, …) are still exported as aliases and marked `@deprecated`. Prefer the names without the prefix.
