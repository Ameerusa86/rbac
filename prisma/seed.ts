import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROLE_SHEET_NAME = "RBAC";
const ROLE_NAME_COLUMN = "Job Role Group";
const DESCRIPTION_COLUMNS = ["Default Manager", "Existing Role in Paylocity?"];
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
  if (value == null) {
    return "";
  }

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

function extractPermissions(row: Record<string, unknown>) {
  const permissions = new Map<
    string,
    { key: string; displayName: string; category: string }
  >();

  for (const [column, rawValue] of Object.entries(row)) {
    if (IGNORED_COLUMNS.has(column)) {
      continue;
    }

    if (typeof rawValue === "boolean") {
      if (rawValue) {
        const displayName = column;
        const key = normalizePermissionKey(displayName);
        permissions.set(key, { key, displayName, category: column });
      }

      continue;
    }

    const cellValue = readCell(rawValue);
    if (!cellValue) {
      continue;
    }

    const values = splitPermissionValues(cellValue).filter(
      isMeaningfulPermissionValue,
    );
    if (values.length === 0) {
      continue;
    }

    for (const value of values) {
      const displayName = buildPermissionLabel(column, value);
      const key = normalizePermissionKey(`${column} ${value}`);

      permissions.set(key, {
        key,
        displayName,
        category: column,
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
      permissions: Map<
        string,
        { key: string; displayName: string; category: string }
      >;
    }
  >();

  for (const row of rows) {
    const roleName = readCell(row[ROLE_NAME_COLUMN]);
    if (!roleName) {
      continue;
    }

    const description = buildDescription(row);
    const permissionEntries = extractPermissions(row);
    const existingRole = roles.get(roleName) ?? {
      description: null,
      permissions: new Map(),
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
  let importedPermissions = 0;

  for (const [roleName, roleData] of roles) {
    const permissionEntries = [...roleData.permissions.values()];

    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        description: roleData.description,
      },
      create: {
        name: roleName,
        description: roleData.description,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permissionEntry of permissionEntries) {
      const permission = await prisma.permission.upsert({
        where: { key: permissionEntry.key },
        update: {
          displayName: permissionEntry.displayName,
          category: permissionEntry.category,
        },
        create: {
          key: permissionEntry.key,
          displayName: permissionEntry.displayName,
          category: permissionEntry.category,
        },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    importedRoles += 1;
    importedPermissions += permissionEntries.length;
  }

  console.log(
    `Seed completed from sheet: ${sheetName}. Imported ${importedRoles} roles and ${importedPermissions} role-permission links.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
