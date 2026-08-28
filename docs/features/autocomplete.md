# Autocomplete

`AutocompleteField` sets a many-to-one association by typing. Search runs on the server (`x-lazy-auto-complete-suggestions`). Display and search fields can be paths (`assoc1.assoc2.fieldX`).

## On a form

```tsx
import { AutocompleteField } from '@chilibase/frontend/autocomplete-field'

<AutocompleteField
  form={this}
  assocField="brandAssoc"
  displayField="name"
  AssocForm={BrandForm}
  SearchBrowse={BrandBrowse}
/>
```

`displayField` can be a string or `string[]` (several columns in the suggestion list).

| Prop | Meaning |
| --- | --- |
| `assocField` | Many-to-one path (dropdown/autocomplete runs on the last assoc) |
| `displayField` | Field(s) shown and searched |
| `AssocForm` / `assocFormElement` | Insert / edit the selected row in a form |
| `SearchBrowse` / `searchBrowseElement` | Open a browse to pick a row |
| `suggestionsLoad` | How suggestions are loaded (`lazy` is the usual DB search) |
| `lazyLoadMaxRows` | Cap for lazy load |
| `minLength` | Characters before search (default `1`) |
| `filter` | Extra `CustomFilter`, or `(entityRow) => CustomFilter` |
| `sortField` | Sort of suggestions |
| `fields` | Extra associations to fetch with suggestions |
| `dropdownButtonEnabled` | Show the dropdown button (default `true`) |

There is also `AutocompleteInput` (no form binding) and `TableAutocompleteField` / `AutocompleteColumn` for `FormDataTable`.

## In a browse filter

On `LazyDataTable`, set `autoComplete` on a `Column` (`true` infers the field, or pass an options object) so the column filter uses autocomplete instead of a plain input.

## Search field

If you prefer a button that opens a browse (no typeahead), use `SearchField` (`@chilibase/frontend/search-field`) with a browse that forwards `searchBrowseParams`.
