# Browse / lazy table

`LazyDataTable` is the main list component. A browse screen is usually a thin wrapper: entity name, columns, and the form used to insert/edit.

Built-in behaviour:

- Filtering (per column and optional full-text search)
- Sorting and paging
- Association paths (`assoc1.assoc2.fieldX`)
- Dropdown, autocomplete, or custom filter in column headers
- Export to Excel, CSV, JSON
- Open form for insert / edit
- Row expansion
- Column visibility toggle
- Filter / sort / paging state stored in session (or local) storage

## Minimal browse

This is the framework’s own user administration browse:

```tsx
import {
  Column,
  LazyDataTable,
  type SearchBrowseProps
} from '@chilibase/frontend/lazy-data-table'
import { UserForm } from './UserForm'
import { XUtils } from '@chilibase/frontend/utils'
import type { User } from './user.entity'

export const UserBrowse = (props: SearchBrowseProps) => {
  const onRemoveRow = async (selectedRow: User): Promise<boolean> => {
    if (selectedRow.username === XUtils.getUsername()) {
      alert('Can not remove current user.')
      return false
    }
    if (window.confirm('Are you sure to remove the selected row?')) {
      await XUtils.removeRow('User', selectedRow)
      return true
    }
    return false
  }

  return (
    <LazyDataTable
      entity="User"
      label="Users"
      rows={30}
      EditForm={UserForm}
      removeRow={onRemoveRow}
      searchBrowseParams={props.searchBrowseParams}
    >
      <Column field="id" header="ID" />
      <Column field="username" header="Username" width="17rem" />
      <Column field="name" header="Name" width="17rem" />
      <Column field="enabled" header="Enabled" />
      <Column field="admin" header="Admin" />
    </LazyDataTable>
  )
}
```

`EditForm={UserForm}` adds insert and edit buttons and opens `UserForm` in a dialog. Passing `searchBrowseParams` lets the same browse work as a row picker for autocomplete / search fields.

A larger example (filters, associations, export) is [CarBrowse.tsx](https://github.com/chilibase/car-demo/blob/main/frontend/src/forms/CarBrowse.tsx) in car-demo.

## Useful `LazyDataTable` props

| Prop | Meaning |
| --- | --- |
| `entity` | TypeORM entity name (as known to metadata), e.g. `"User"`, `"Car"` |
| `label` | Title above the table |
| `rows` | Page size (default `30`) |
| `paginator` | Default `true` |
| `filterDisplay` | `"row"` (default) or `"menu"` |
| `autoFilter` | Filter immediately without the Filter button |
| `fullTextSearch` | `false` / `true` (default columns) / `string[]` of fields |
| `EditForm` / `editFormElement` | Form for insert and update |
| `onAddRow` / `onEdit` | Override or disable add/edit (`false` hides the button) |
| `removeRow` | `true` or async `(row) => boolean` — show remove |
| `customFilter` | Server-side filter the user cannot change |
| `optionalCustomFilters` | Named filters in a dropdown next to Filter / Clear |
| `filters` | Initial / controlled PrimeReact filter meta |
| `sortField` | Initial sort (`string` or `DataTableSortMeta[]`) |
| `fields` | Extra association paths to load besides columns |
| `showExportRows` | Export button; default: desktop only |
| `showColumnToggleButton` | Default `true` |
| `searchBrowseParams` | When this browse is used to pick a row |
| `rowExpansionTemplate` / `showExpandedRow` | Extra rows per DB row |
| `stateKey` | Storage key if several browses share one entity |
| `appButtonsForRow` | Extra buttons that receive the selected row |
| `ref` | `reread()` after save (see `LazyDataTableRef`) |

## Columns

```tsx
<Column field="brandAssoc.name" header="Brand" width="12rem" />
<Column field="price" header="Price" align="right" betweenFilter="row" />
<Column field="status" header="Status" dropdownInFilter />
```

| Prop | Meaning |
| --- | --- |
| `field` | Attribute or path |
| `header` | Column title |
| `width` | e.g. `10rem`, `150px`; a bare number means rem |
| `align` | `left` / `center` / `right` |
| `dropdownInFilter` | Distinct values dropdown in the filter |
| `autoComplete` | Autocomplete in the filter (`true` or options object) |
| `betweenFilter` | From–to for date/number (`"row"` / `"column"` / `"noBetween"`) |
| `textFormat` | `"multiline"` or `"html"` for wrapping / rich text |
| `body` | Custom cell renderer |
| `initColumnToggle` | `false` = hidden until the user enables it |
| `filterElement` | Fully custom filter UI |
| `aggregateType` | Aggregate in the footer |

## Search browse

To use one browse both as a normal list and as a picker, type props as `BrowseProps & SearchBrowseProps` (or at least `SearchBrowseProps`) and forward `searchBrowseParams` into `LazyDataTable`. Autocomplete and search fields pass those params when they open the browse.

## Export

The export dialog posts the **current** filter/sort to:

- `x-lazy-data-table-export-excel`
- `x-lazy-data-table-export-csv`
- `x-lazy-data-table-export-json`

CSV and JSON are streamed. Excel uses exceljs.

## After save

Call `reread()` on the table ref from the form’s `onSaveOrCancel` so the list reloads. (The older `displayed` / `XFormNavigator` flow is deprecated.)
