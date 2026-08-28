# Conventions

## Prefix `X`

Framework names use **X** so they do not collide with application names:

- Tables: `x_user`, `x_file_meta`, `x_browse_meta`, …
- CSS: `x-form-row`, `x-form-col`, `x-form-header`, …
- Older TypeScript API: `XFormBase`, `XUtils`, `XLazyDataTable`

Current public API drops the prefix (`FormBase`, `LazyDataTable`). Deprecated aliases keep the `X` names.

`UtilsCommon` is exported as `XUtilsCommon` so the app can keep the name `UtilsCommon`. Environment enums on the frontend are exported as `XEnvVar` for the same reason.

## Entity names in the UI

`LazyDataTable entity="User"` and `super(props, "User")` use the **TypeORM entity name** (class name by default), not the table name `x_user`.

## Field paths

Dotted paths walk associations: `modifUser.name`, `brandAssoc.country.code`. One-to-many in a browse column can produce multiple table rows per DB row (row expansion / multiline). `fields` / `assocList` list paths the backend should join.

## ESM and pnpm

Packages are `"type": "module"`. Backend imports use `.js` extensions in TypeScript source. Apps are expected to use **pnpm** (`preinstall` uses `only-allow pnpm`). `packageManager` is `pnpm@11.4.0`.

## Administration UI

`@chilibase/frontend/administration` ships browse/form for users, parameters, and browse metadata. Wire them into your menu like any other browse.

## Contact

Questions: [michalrakus@gmail.com](mailto:michalrakus@gmail.com).
