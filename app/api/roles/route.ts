import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { enforceManagerAccess } from "@/lib/auth/manager-guard";
import { createRoleSchema } from "@/lib/validation/roles";

class InactiveSystemError extends Error {
  constructor(systemName: string) {
    super(`System \"${systemName}\" is inactive and cannot be assigned.`);
    this.name = "InactiveSystemError";
  }
}

function normalizePermissionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferSystemName(label: string) {
  const [systemName] = label.split(":");
  const normalized = systemName?.trim();
  return normalized || "General";
}

async function upsertPermissions(permissionLabels: string[]) {
  const uniqueLabels = [
    ...new Set(permissionLabels.map((label) => label.trim()).filter(Boolean)),
  ];

  return Promise.all(
    uniqueLabels.map(async (label) => {
      const key = normalizePermissionKey(label);
      const systemName = inferSystemName(label);

      const existingSystem = await db.system.findUnique({
        where: { name: systemName },
        select: { id: true, isActive: true, name: true },
      });

      if (existingSystem && !existingSystem.isActive) {
        throw new InactiveSystemError(existingSystem.name);
      }

      const system =
        existingSystem ??
        (await db.system.create({
          data: { name: systemName, isActive: true },
          select: { id: true },
        }));

      return db.permission.upsert({
        where: { key },
        update: {
          displayName: label,
          systemId: system.id,
        },
        create: {
          key,
          displayName: label,
          systemId: system.id,
        },
      });
    }),
  );
}

export async function GET() {
  try {
    const roles = await db.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        permissions: role.rolePermissions.map(
          (rp) => rp.permission.displayName,
        ),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load roles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const accessError = enforceManagerAccess(request);
  if (accessError) {
    return accessError;
  }

  try {
    const body = await request.json();
    const parsed = createRoleSchema.parse(body);

    const permissionRecords = await upsertPermissions(parsed.permissions);

    const created = await db.role.create({
      data: {
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        isActive: parsed.isActive,
        rolePermissions: {
          create: permissionRecords.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    return NextResponse.json(
      {
        data: {
          id: created.id,
          name: created.name,
          description: created.description,
          isActive: created.isActive,
          permissions: created.rolePermissions.map(
            (rp) => rp.permission.displayName,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InactiveSystemError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.issues },
        { status: 400 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 },
    );
  }
}
