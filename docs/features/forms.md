# Forms

A form edits one entity row (insert or update). It is usually opened from a browse, autocomplete, or another form, in a **dialog**.

Subclass `FormBase` or `FormBaseModif` (the latter sets `modifDate` and `modifUser` on save). Pass the entity name in the constructor.

## Shape of a form

Framework administration form (`UserForm`) shows the usual structure: header, fields, footer.

```tsx
import type { FormProps, FormErrorMap } from '@chilibase/frontend/form'
import { FormBaseModif, FormFooter, FormHeader } from '@chilibase/frontend/form'
import { TextField } from '@chilibase/frontend/text-field'
import { NumberField } from '@chilibase/frontend/number-field'
import { CheckboxField } from '@chilibase/frontend/checkbox-field'
import { DateField } from '@chilibase/frontend/date-field'
import type { EntityRow } from '@chilibase/frontend/common'

export class UserForm extends FormBaseModif {
  constructor(props: FormProps) {
    super(props, 'User')
  }

  createNewObject(): EntityRow {
    return { enabled: true, admin: false, version: 0 }
  }

  render() {
    return (
      <div>
        <FormHeader label="User" />
        <div className="x-form-row">
          <div className="x-form-col">
            <NumberField form={this} field="id" label="ID" readOnly labelStyle={{ width: '14rem' }} />
            <TextField form={this} field="username" label="Username" size={30} labelStyle={{ width: '14rem' }} />
            <TextField form={this} field="name" label="Name" size={30} labelStyle={{ width: '14rem' }} />
            <CheckboxField form={this} field="enabled" label="Enabled" labelStyle={{ width: '14rem' }} />
            <CheckboxField form={this} field="admin" label="Admin" labelStyle={{ width: '14rem' }} />
            <DateField form={this} field="modifDate" label="Modified at" readOnly labelStyle={{ width: '14rem' }} />
            <TextField form={this} field="modifUser.name" label="Modified by" size={20} labelStyle={{ width: '14rem' }} />
          </div>
        </div>
        <FormFooter form={this} />
      </div>
    )
  }
}

(UserForm as any).assocList = (): string[] => {
  return ['modifUser']
}
```

`FormFooter` renders Save / Cancel and calls `onClickSave` / `onClickCancel`. Layout helpers `FormRow` / `FormCol` from `@chilibase/frontend/form-layout` can replace the `x-form-row` / `x-form-col` divs. For large forms, PrimeReact `TabView` is supported; set `this.tabViewUsed = true` so widths stay correct on mobile.

A fuller example with associations and a detail table: [CarForm.tsx](https://github.com/chilibase/car-demo/blob/main/frontend/src/forms/CarForm.tsx).

## Field components

Every field gets `form={this}`. Scalar fields use `field`; many-to-one fields use `assocField` + `displayField`.

| Component | Import | Use |
| --- | --- | --- |
| `TextField` | `@chilibase/frontend/text-field` | String |
| `NumberField` | `@chilibase/frontend/number-field` | Numeric |
| `DateField` | `@chilibase/frontend/date-field` | Date / datetime |
| `IntervalField` | `@chilibase/frontend/interval-field` | PostgreSQL interval |
| `CheckboxField` | `@chilibase/frontend/checkbox-field` | Boolean |
| `MultilineTextField` | `@chilibase/frontend/multiline-text-field` | Textarea (autoresize) |
| `RichTextField` | `@chilibase/frontend/rich-text-field` | Quill editor |
| `SelectField` | `@chilibase/frontend/select-field` | Many-to-one dropdown |
| `AutocompleteField` | `@chilibase/frontend/autocomplete-field` | Many-to-one search |
| `SearchField` | `@chilibase/frontend/search-field` | Pick row via browse |
| `ToOneAssocButton` | `@chilibase/frontend/to-one-assoc-button` | Open associated form |
| `InputFileList` | `@chilibase/frontend/input-file-list` | One-to-many files |
| `MultiSelectField` | `@chilibase/frontend/multi-select-field` | Multi select |

Common field props: `label`, `readOnly` (boolean or `(row) => boolean`), `onChange`, `tooltip` / `labelTooltip` / `desc`, `onlyInput`.

Required / max length come from entity metadata (`isNullable`, `length`).

## Loading and saving

**Insert**

1. Static `createObject(params?)` if defined, else `createNewObject()` / `createNewObjectAsync()`.
2. Optional `initValues` merged in (legacy loading).

**Update**

1. Static `loadObject(id, params?)`, or `assocList(params?)` plus `Utils.fetchById`.
2. `assocList` is a list of association paths to join, e.g. `['modifUser', 'brandAssoc', 'rideList.country']`.

**Save**

1. Built-in validation (types, required) plus `validate(entityRow)` for custom errors.
2. `preSave(entityRow)` (or `FormBaseModif`’s default).
3. `saveRow()` → `POST x-save-row` unless you override it (users go through `x-user-save-row`).

Return type of `validate`:

```ts
async validate(entityRow: EntityRow): Promise<FormErrorMap> {
  const errors: FormErrorMap = {}
  if (entityRow.vin && entityRow.vin.length < 3) {
    errors.vin = 'Length must be at least 3.'
  }
  return errors
}
```

## Master-detail (`FormDataTable`)

One-to-many associations are edited as a table on the form. Backend save persists detail rows when the TypeORM relation has `cascade: ["insert", "update", "remove"]`.

```tsx
import { FormDataTable, Column, SelectColumn } from '@chilibase/frontend/form-data-table'

<FormDataTable form={this} assocField="rideList" label="Rides">
  <Column field="date" header="Date" />
  <SelectColumn assocField="country" displayField="name" header="Country" />
</FormDataTable>
```

Column kinds:

- `Column` — scalar input
- `SelectColumn` — many-to-one dropdown
- `AutocompleteColumn` — many-to-one autocomplete (can open form / browse)
- `SearchButtonColumn` — pick via browse
- `MultilineTextColumn` — textarea
- `CustomColumn` — custom `body`

`FormPanelList` (free layout of a detail row) is **not** in core yet.

## Locking

- **Optimistic** (default): entity has `@VersionColumn() version`. `OptimisticLockingSubscriber` throws if the version changed in the database.
- **Pessimistic** (optional): constructor `super(props, 'Car', true)` and fields `lockDate` / `lockUser` on the entity. Used when another user already holds the row.

## Form props

```ts
interface FormProps {
  entityRow?: EntityRow  // preferred: already created or loaded
  id?: number            // legacy load
  initValues?: object    // legacy insert defaults
  onSaveOrCancel?: (row, operation) => void
  isInDialog?: boolean
  params?: Params
}
```

`FormWithLoader` wraps a form type or element, loads `entityRow` from `createObject` / `loadObject`, then renders the form. Browse uses this when opening `EditForm`.
