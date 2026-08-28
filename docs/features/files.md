# Files

File attachments are not stored as a blob direct on the business entity. The business entity has a **many-to-one** assoc to entity `FileMeta` (`x_file_meta`). For each uploaded file, one `FileMeta` row is created and the reference (foreign key in DB) to this row is written into the business entity using **many-to-one** assoc.

## Entity `FileMeta`

| Column | Role                                                                          |
| --- |-------------------------------------------------------------------------------|
| `name` | Original file name                                                            |
| `size` | Size in bytes                                                                 |
| `pathName` | Relative path under `app-files/x-files/`, used when stored on disk            |
| `data` | type `bytea` (file bytes), used when stored in the database (`select: false`) |
| `modifDate` / `modifUser` | Audit                                                                         |

File can be stored on disk (recommended approach) (`pathName` is set, `data` is null) or file can be stored in the `FileMeta` row in the attribute `data` (`pathName` null). Storing in the DB is not recommended for large files.

Upload endpoints:

- `x-upload-file-into-file-system` — multer writes to `app-files/uploaded/`, then the file is moved to `app-files/x-files/[subdir]/id-<id>-<filename>`
- `x-upload-file-into-db` — file kept in `FileMeta.data`

Download uses the matching download endpoint on `FileController`. Progress is shown in the upload UI.

## `InputFileList`

```tsx
import { InputFileList } from '@chilibase/frontend/input-file-list'

<InputFileList
  form={this}
  assocField="fileList"
  saveDest="fileSystem"
  subdir="cars"
  maxFileSize={10 * 1024 * 1024}
/>
```

| Prop | Meaning |
| --- | --- |
| `assocField` | One-to-many from the form entity to the join / file entity |
| `saveDest` | `"fileSystem"` (default) or `"database"` |
| `subdir` | Subfolder under `app-files/x-files/` |
| `maxFileSize` | Max size in bytes |
| `readOnly` | Hide upload / remove |

The component expects the detail entity to have a many-to-one to `FileMeta`. On save of the parent form, new `FileMeta` ids are already stored; removing a row can delete the file from disk after the transaction commits.

Create `app-files/x-files` on the server (and persist it in Docker) if you use filesystem storage.
