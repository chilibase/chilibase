# Chilibase

Fullstack framework for creating model driven apps.  
Uses react (primereact), vite, nestjs, typeorm, postgres DB. Platform: javascript/typescript.  
Similar to low coding frameworks. 

See live demo at https://car-demo.michalrakus.sk  
Username: x_test_user@yahoo.com  
Password: fd4eg4DN45ggd

Source code of car demo app: https://github.com/chilibase/car-demo  
(Source code is also available via links in demo.)  

The framework is suitable for small-budget projects, all used libraries are open source.  
The projects created in this framework are running on Linux VPS using Docker, for deployment is used GitHub Actions. VPS is hosted on hetzner.com.  
If there is interest, I can create the documentation about deployment/infrastructure.  

Contact: michalrakus@gmail.com

## Install

### Prerequisites

Install postgres DB  
Install pnpm (e.g. using command: `npm install -g pnpm@latest-10`)

Create new chilibase project using create script `create-chilibase` and follow the instructions in the console.

```
pnpx create-chilibase <app-name> <db-name> <db-schema-name>
```
## Features

### User authentication types

- auth0.com (enables authentication via social networks like Google, Facebook, ...)
- MS Entra ID (original Azure Active Directory)
- local authentication (hashed password stored in DB; only access token implemented, refresh token still missing)

### Lazy data table (key component of the browse component)

- filtering (via columns or via all fields)
- sorting 
- paging
- many-to-one and one-to-many associations (field paths like `assoc1.assoc2.fieldX`)
- dropdown, autocomplete and custom components for filtering in column headers
- export data to file - excel, csv, json
- parameter *form component* - enables inserting and editing rows (in the *form component*)
- row expansion (DB row displayed in multiple table rows)
- source code example: [CarBrowse.tsx](https://github.com/chilibase/car-demo/blob/main/frontend/src/forms/CarBrowse.tsx)

### Form component (for the row editing)

- input components for the editing of all basic field types (string, decimal, date, interval, ...)
- dropdown and autocomplete component for setting of the associated row (via many-to-one association)
- text area inputs for multiline texts (with autoresize)
- rich text support - editor based on library `quill`
- for large forms, primereact component `TabView` can be used
- supports master-detail (one-to-many associations)
  * component FormDataTable enables editing of the detail rows in the table layout
  * component FormPanelList enables custom layout of the inputs for detail row (*)
  * in the detail rows, also dropdown and autocomplete components are supported
  * on the backend, saving detail rows is implemented
- basic validation (check and conversion of types, check for required fields)
- custom validation supported
- custom fetching row supported
- *form component* is generally displayed in dialog, that means that associated rows can be created/edited during editing of the base row
- optimistic locking (via field `version` in DB row)
- pessimistic locking (via fields `lock_date`, `lock_x_user_id` in DB row) (*)
- source code example: [CarForm.tsx](https://github.com/chilibase/car-demo/blob/main/frontend/src/forms/CarForm.tsx)

### AutoComplete component

- lazy loading supported (search performed on DB via SQL)
- multiple fields can be displayed and searched through in autocomplete (fields can be also paths like `assoc1.assoc2.fieldX`)
- parameter *form component* - enables insert new row and edit of the selected row (in the *form component*)
- parameter *browse component* - enables search row in the *browse component* (via lazy data table)

### Uploading/downloading files

- file is saved in entity via many-to-one association to framework entity `XFile` (table `x_file`)
- file can be stored in filesystem (recommended) or in DB table `x_file` (not recommended)
- progress of uploading is displayed


### Other features

- menu
- react router
- responsive design, mobile phone resolution also supported
- export to excel - via library `exceljs`
- export to excel via templating (placeholders like `{assoc1.assoc2.fieldX}` in excel template) - implemented, also uses `exceljs` (*)
- export to word via templating (placeholders like `{assoc1.assoc2.fieldX}` in word template) - uses library `docxtemplater` (*)
- statistics module (based on principles of contingency table in excel) (*)
- reporting module for creating excel exports in runtime (*)
- logging sql queries including execution time.
- both backend and frontend use ESM (tsc compiles to ESM)
- all used third party libraries are open source

(*) - these features are not part of the chilibase for this moment, because they are in some project or in the previous version of the library (they can be moved to chilibase on demand)