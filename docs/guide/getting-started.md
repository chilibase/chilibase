# Getting started

Chilibase is a fullstack framework for **model-driven** CRUD apps. You define TypeORM entities; the UI (browse tables and forms) is built from that model with React and PrimeReact.

Current library version in this repository is `@chilibase/frontend` **0.7.1** and `@chilibase/backend` **0.7.0**. Node **22.12+** and pnpm **11+** are required.

## Live demo

A sample car-rental style app is running at [car-demo.michalrakus.sk](https://car-demo.michalrakus.sk).

- Username: `x_test_user@yahoo.com`
- Password: `fd4eg4DN45ggd`

Source of that app: [github.com/chilibase/car-demo](https://github.com/chilibase/car-demo). The demo also links to the source of each screen.

## Create a project

1. Install [PostgreSQL](https://www.postgresql.org/).
2. Install pnpm:

```sh
npm install -g pnpm
```

3. Scaffold an app with `create-chilibase` and follow the console prompts:

```sh
pnpx create-chilibase@0.3.3 <app-name> <db-name> <db-schema-name>
```

The scaffold creates a frontend (Vite + React) and a backend (NestJS) that depend on `@chilibase/frontend` and `@chilibase/backend`.

## What you typically add

For each business entity you usually create:

1. A DB table (create table script).
2. A TypeORM entity class (table mapping).
3. A **browse** screen — `LazyDataTable` plus `Column`s, often with an `EditForm`.
4. A **form** — a class extending `FormBase` / `FormBaseModif` with field components.

See [Concepts](/guide/concepts) to learn about the main principles of the framework.

See [Browse](/features/browse) and [Forms](/features/forms). Full examples live in [car-demo](https://github.com/chilibase/car-demo) ([`CarBrowse.tsx`](https://github.com/chilibase/car-demo/blob/main/frontend/src/forms/CarBrowse.tsx), [`CarForm.tsx`](https://github.com/chilibase/car-demo/blob/main/frontend/src/forms/CarForm.tsx)).
