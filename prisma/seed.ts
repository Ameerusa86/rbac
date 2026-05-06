import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

if (!process.env.DATABASE_URL) {
  config({
    path: [
      path.join(process.cwd(), ".env.local"),
      path.join(process.cwd(), ".env"),
    ],
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaMssql(process.env.DATABASE_URL),
});

const ROLE_SHEET_NAME = "RBAC";
const ROLE_NAME_COLUMN = "Job Role Group";
const DESCRIPTION_COLUMNS = ["Manager"];

const IGNORED_COLUMNS = new Set([ROLE_NAME_COLUMN, ...DESCRIPTION_COLUMNS]);

const EMPTY_PERMISSION_VALUES = new Set([
  "",
  "-",
  "--",
  "0",
  "false",
  "n/a",
  "na",
  "none",
  "none - no access",
  "no access",
  "not applicable",
  "no",
]);

function normalizePermissionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readCell(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function buildDescription(row: Record<string, unknown>) {
  const parts = DESCRIPTION_COLUMNS.map((column) => {
    const value = readCell(row[column]);
    return value ? `${column}: ${value}` : null;
  }).filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function splitPermissionValues(value: string) {
  return value
    .split(/\r?\n+/)
    .flatMap((part) => part.split(/[;|]+/))
    .map((part) => part.trim())
    .filter(Boolean);
}

function isMeaningfulPermissionValue(value: string) {
  return !EMPTY_PERMISSION_VALUES.has(value.trim().toLowerCase());
}

function buildPermissionLabel(column: string, value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "yes" || normalized === "true" || normalized === "x") {
    return column;
  }

  return `${column}: ${value.trim()}`;
}

type ExtractedPermission = {
  key: string;
  displayName: string;
  systemName: string;
};

function extractPermissions(row: Record<string, unknown>) {
  const permissions = new Map<string, ExtractedPermission>();

  for (const [column, rawValue] of Object.entries(row)) {
    if (IGNORED_COLUMNS.has(column)) continue;

    if (typeof rawValue === "boolean") {
      if (rawValue) {
        const displayName = column;
        const key = normalizePermissionKey(column);

        permissions.set(key, {
          key,
          displayName,
          systemName: column,
        });
      }

      continue;
    }

    const cellValue = readCell(rawValue);
    if (!cellValue) continue;

    const values = splitPermissionValues(cellValue).filter(
      isMeaningfulPermissionValue,
    );

    if (values.length === 0) continue;

    for (const value of values) {
      const displayName = buildPermissionLabel(column, value);
      const key = normalizePermissionKey(`${column} ${value}`);

      permissions.set(key, {
        key,
        displayName,
        systemName: column,
      });
    }
  }

  return [...permissions.values()];
}

async function main() {
  const filePath =
    process.env.RBAC_XLSX_PATH ||
    path.join(process.cwd(), "RBAC_Data", "RBAC.xlsx");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Workbook not found at: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);

  const sheetName = workbook.SheetNames.includes(ROLE_SHEET_NAME)
    ? ROLE_SHEET_NAME
    : workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Workbook has no sheets");
  }

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const roles = new Map<
    string,
    {
      description: string | null;
      permissions: Map<string, ExtractedPermission>;
    }
  >();

  for (const row of rows) {
    const roleName = readCell(row[ROLE_NAME_COLUMN]);
    if (!roleName) continue;

    const description = buildDescription(row);
    const permissionEntries = extractPermissions(row);

    const existingRole = roles.get(roleName) ?? {
      description: null,
      permissions: new Map<string, ExtractedPermission>(),
    };

    if (!existingRole.description && description) {
      existingRole.description = description;
    }

    for (const permission of permissionEntries) {
      existingRole.permissions.set(permission.key, permission);
    }

    roles.set(roleName, existingRole);
  }

  let importedRoles = 0;
  let importedSystems = 0;
  let importedPermissions = 0;
  let importedRolePermissionLinks = 0;

  for (const [roleName, roleData] of roles) {
    const permissionEntries = [...roleData.permissions.values()];

    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        description: roleData.description,
        isActive: true,
      },
      create: {
        name: roleName,
        description: roleData.description,
        isActive: true,
      },
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    for (const permissionEntry of permissionEntries) {
      const system = await prisma.system.upsert({
        where: { name: permissionEntry.systemName },
        update: {
          isActive: true,
        },
        create: {
          name: permissionEntry.systemName,
          isActive: true,
        },
      });

      importedSystems += 1;

      const permission = await prisma.permission.upsert({
        where: { key: permissionEntry.key },
        update: {
          displayName: permissionEntry.displayName,
          systemId: system.id,
        },
        create: {
          key: permissionEntry.key,
          displayName: permissionEntry.displayName,
          systemId: system.id,
        },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });

      importedPermissions += 1;
      importedRolePermissionLinks += 1;
    }

    importedRoles += 1;
  }

  console.log("Seed completed successfully.");
  console.log(`Sheet: ${sheetName}`);
  console.log(`Roles imported: ${importedRoles}`);
  console.log(`Systems touched: ${importedSystems}`);
  console.log(`Permissions touched: ${importedPermissions}`);
  console.log(`Role-permission links created: ${importedRolePermissionLinks}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
