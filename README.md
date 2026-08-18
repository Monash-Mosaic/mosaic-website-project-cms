# MOSAIC Project CMS

Google Apps Script CMS for managing website projects with draft, approval, rejection, archive, and audit tracking.

## Data Model

- `Projects`: `projectId`, `currentVersion`, `createdAt`, `createdBy`, `archived`
- `ProjectVersions`: `versionId`, `projectId`, `version`, `name`, `subtitle`, description, image, link, status, and approval fields
- `Users`: `email`, `role`, `active`
- `AuditLog`: immutable activity history

## Roles

- `ADMIN`: approve, reject, delete, manage users
- `CREATOR`: create, update, submit, archive
- `VIEWER`: read-only

User management supports full CRUD (create, read, update, delete) for admins.

## Local Test

From the repo root:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Alternative:

```bash
cd src
npx serve
```

## Useful Commands

```bash
npx clasp status
npx clasp pull
npx clasp push
npx clasp open
npx clasp deployments
```

## Dummy Data

Local mode reads table-shaped JSON from:

- `src/dummy/data/projects.json`
- `src/dummy/data/projectVersions.json`
- `src/dummy/data/users.json`
- `src/dummy/data/auditLog.json`
