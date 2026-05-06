import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

interface UpdateRoleRequestBody {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  permissionIds?: number[];
}

interface RolePermissionData {
  roleId: number;
  permissionId: number;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const roleId = Number(id);

  if (Number.isNaN(roleId)) {
    return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
  }

  const body = await request.json();

  const name = String(body.name ?? "").trim();
  const description = body.description ? String(body.description).trim() : null;
  const isActive = Boolean(body.isActive);
  const permissionIds = Array.isArray(body.permissionIds)
    ? body.permissionIds
        .map(Number)
        .filter((value: unknown) => !Number.isNaN(value))
    : [];

  if (!name) {
    return NextResponse.json(
      { error: "Role name is required" },
      { status: 400 },
    );
  }

  try {
    const role = await db.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: roleId },
        data: {
          name,
          description,
          isActive,
        },
      });

      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (permissionIds.length > 0) {
        const rolePermissionData: RolePermissionData[] = permissionIds.map(
          (permissionId: number): RolePermissionData => ({
            roleId,
            permissionId,
          }),
        );
        await tx.rolePermission.createMany({
          data: rolePermissionData,
        });
      }

      return updatedRole;
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error("Failed to update role:", error);

    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const roleId = Number(id);

  if (Number.isNaN(roleId)) {
    return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.role.delete({ where: { id: roleId } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete role:", error);

    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 },
    );
  }
}
