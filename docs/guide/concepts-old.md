# Concepts old

This is the previous concepts page. The current page is [Concepts](/guide/concepts).

Chilibase sits between a hand-written CRUD stack and a low-code platform. You still write TypeScript, but browse screens, forms, filters, and persistence follow a shared model.

## Model-driven UI

TypeORM metadata is exposed to the frontend (entity names, fields, associations, nullability, lengths). Field components use that metadata so you do not repeat types, max length, or required flags in every form.

Typical loop:

1. Define / change a TypeORM entity.
2. Restart or reload metadata on the backend.
3. Point `LazyDataTable` / form fields at entity names and field paths.

## Browse and form

Almost every entity has two UI pieces:

| Piece | Role |
| --- | --- |
| **Browse** | List of rows (`LazyDataTable`). Filter, sort, page, export, open form. |
| **Form** | Insert / update one row. Usually opened in a **dialog**, so you can create or edit an associated row without leaving the parent form. |

The same browse can be reused as a **search browse** (pick a row for an association). Pass `searchBrowseParams` for that mode.

## Field paths

Associations are addressed with dotted paths, on both browse columns and form fields:

```
brandAssoc.name
rideList.country.code
modifUser.name
```

The backend joins what is needed. You can go through many-to-one and one-to-many associations.

## Dialogs and nesting

Forms are generally shown in a dialog. From a form you can:

- Pick an associated row (select, autocomplete, or search browse).
- Insert or edit that associated row in another form dialog.

Save / cancel of the inner form returns the row to the outer form.

## Loading a form row

Prefer the **loader** style: pass `entityRow` into the form (created or loaded before render). Static helpers on the form class:

- `createObject` — insert
- `assocList` / `loadObject` — update (which associations to join)

There is a **legacy** path (`id` + load in `componentDidMount`) still used in some forms. `VITE_LEGACY_OBJECT_LOADING` controls whether defaults fill in when those static methods are missing. New forms should use `createObject` and `assocList` (or `loadObject`).

## Save, details, and locking

- Default save endpoint is `x-save-row`.
- One-to-many **detail rows** are saved with the master when TypeORM associations use `cascade: ["insert", "update", "remove"]`.
- **Optimistic locking** uses a TypeORM `@VersionColumn()` (`version`). A subscriber rejects the update if the version in the database does not match.
- **Pessimistic locking** (`lockDate` / `lockUser`) is implemented in persistence for entities that have those fields. It is optional and not required for typical apps.

`FormBaseModif` sets `modifDate` and `modifUser` before save.

## Prefix `X`

Framework objects often use prefix **X** so they do not clash with application names: tables (`x_user`, `x_file_meta`), CSS classes, older API names (`XFormBase`, `XUtils`). Current exports use names without the prefix (`FormBase`, `Utils`); the `X…` names remain as deprecated aliases.

## What is not in core yet

These exist in some apps or older library versions and can be moved into Chilibase on demand:

- `FormPanelList` (custom layout of detail rows)
- Excel / Word export via templates (`{assoc1.assoc2.fieldX}`)
- Statistics and runtime reporting modules
