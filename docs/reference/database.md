# Database

PostgreSQL is the supported database. SQL scripts live in `backend/src/sql_scripts_postgresql/`. Replace `<schema>` with your schema name.

## Core tables (`create_tables_x.sql`)

| Table | Entity | Role |
| --- | --- | --- |
| `x_user` | `User` | Accounts (`username`, optional `password`, `name`, `enabled`, `admin`, `version`) |
| `x_browse_meta` | `BrowseMeta` | Saved browse (entity, optional `browse_id`, row count) |
| `x_column_meta` | `ColumnMeta` | Saved columns (field, header, align, width, order, dropdown-in-filter) |
| `x_file_meta` | `FileMeta` | Uploaded files (name, size, `path_name` or `bytea` `data`) |

`x_user.username` is unique. `password` is `CHAR(60)` (bcrypt); unused for OAuth.

The script also creates extension `unaccent` in the app schema (full-text / accent-insensitive search).

## Enums and parameters (`create_tables_x_enums.sql`)

| Table | Entity | Role |
| --- | --- | --- |
| `x_enum_type` | `EnumType` | Named enum (code, name, `read_only`) |
| `x_enum_value` | `EnumValue` | Values of an enum |
| `x_parameter` | `Parameter` | Key/value settings (`code`, `name`, `value`) |

`x_parameter` is read via `x-get-param-value`.

## Application tables

Your tables sit in the same schema. Typical pattern on a row:

- `id` serial primary key
- business columns
- `modif_date`, `modif_x_user_id` (many-to-one to `x_user`)
- `version INT NOT NULL` for optimistic locking (`@VersionColumn()`)

For TypeORM + PostgreSQL use `timestamp` (not `datetime`) and `bytea` for blobs.

## Sequences

`x-get-sequence-value` returns the next value of a named PostgreSQL sequence (used when the app needs an id before insert).
