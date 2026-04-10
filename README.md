# RBAC Manager Role CRUD

Fullstack Next.js app where managers can add, update, and delete job roles.

This implementation includes:

- SQL Server persistence with Prisma
- REST route handlers under `app/api/roles`
- Manager role UI under `app/roles`
- One-time import script from `RBAC_Data/RBAC.xlsx`

## Prerequisites

1. Node.js 20+
2. pnpm
3. SQL Server instance reachable from your machine

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` for your SQL Server.
3. Prisma commands in this project load `.env.local` explicitly.
4. Prisma CLI configuration is defined in `prisma.config.ts`.

Example:

```env
DATABASE_URL="sqlserver://localhost:1433;database=RBAC;user=sa;password=YourStrong!Passw0rd;trustServerCertificate=true"
RBAC_XLSX_PATH="RBAC_Data/RBAC.xlsx"
DEV_MANAGER_MODE="true"
```

Windows auth on local SQL Express:

```env
DATABASE_URL="sqlserver://localhost:1433;database=RBAC;integratedSecurity=true;encrypt=true;trustServerCertificate=true"
```

## Install

```bash
pnpm install
```

## Database Commands

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

If you want migration files instead of direct push:

```bash
pnpm db:migrate
```

## Run App

```bash
pnpm dev
```

Open:

- `http://localhost:3000` for landing page
- `http://localhost:3000/roles` for manager role CRUD UI
- `http://localhost:3000/api/roles` for roles API

## API Summary

- `GET /api/roles` list roles
- `POST /api/roles` create role
- `GET /api/roles/:id` get role details
- `PUT /api/roles/:id` update role
- `DELETE /api/roles/:id` delete role

### Create/Update Payload

```json
{
  "name": "HR Manager",
  "description": "Manages HR operations",
  "isActive": true,
  "permissions": ["employees.read", "employees.update"]
}
```

## Notes

- Import script targets the `RBAC` worksheet in `RBAC.xlsx`.
- Roles are created from the `Job Role Group` column.
- Permissions are derived from the populated access-matrix columns, using the column name as the permission category and the cell value as the permission detail.
