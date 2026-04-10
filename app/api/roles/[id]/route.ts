import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { enforceManagerAccess } from "@/lib/auth/manager-guard";
import { updateRoleSchema } from "@/lib/validation/roles";

function normalizePermissionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function upsertPermissions(permissionLabels: string[]) {
  const uniqueLabels = [
    ...new Set(permissionLabels.map((label) => label.trim()).filter(Boolean)),
  ];

  return Promise.all(
    uniqueLabels.map(async (label) => {
      const key = normalizePermissionKey(label);

      return db.permission.upsert({
        where: { key },
        update: {
          displayName: label,
        },
        create: {
          key,
          displayName: label,
        },
      });
    }),
  );
}

function parseId(id: string) {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const roleId = parseId(id);

    if (!roleId) {
      return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
    }

    const role = await db.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        permissions: role.rolePermissions.map(
          (rp) => rp.permission.displayName,
        ),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load role" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessError = enforceManagerAccess(request);
  if (accessError) {
    return accessError;
  }

  const { id } = await context.params;
  const roleId = parseId(id);

  if (!roleId) {
    return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = updateRoleSchema.parse(body);

    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const permissionRecords =
      parsed.permissions === undefined
        ? null
        : await upsertPermissions(parsed.permissions);

    const updated = await db.role.update({
      where: { id: roleId },
      data: {
        name: parsed.name?.trim(),
        description:
          parsed.description === undefined
            ? undefined
            : parsed.description.trim() || null,
        isActive: parsed.isActive,
        rolePermissions:
          permissionRecords === null
            ? undefined
            : {
                deleteMany: {},
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

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        isActive: updated.isActive,
        permissions: updated.rolePermissions.map(
          (rp) => rp.permission.displayName,
        ),
      },
    });
  } catch (error) {
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
      { error: "Failed to update role" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const accessError = enforceManagerAccess(request);
    if (accessError) {
      return accessError;
    }

    const { id } = await context.params;
    const roleId = parseId(id);

    if (!roleId) {
      return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
    }

    const existing = await db.role.findUnique({ where: { id: roleId } });
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await db.role.delete({ where: { id: roleId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 },
    );
  }
}
