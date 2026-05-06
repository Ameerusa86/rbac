import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const systemId = Number(id);

  if (Number.isNaN(systemId)) {
    return NextResponse.json({ error: "Invalid system ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be a boolean" },
      { status: 400 },
    );
  }

  const confirmCascade = Boolean(body.confirmCascade);

  try {
    const [permissionCount, roleAccessCount] = await Promise.all([
      db.permission.count({ where: { systemId } }),
      db.rolePermission.count({ where: { permission: { systemId } } }),
    ]);

    if (
      !body.isActive &&
      !confirmCascade &&
      (permissionCount > 0 || roleAccessCount > 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Deactivating this system will remove all related permissions and role access mappings.",
          requiresConfirmation: true,
          impact: {
            permissionCount,
            roleAccessCount,
          },
        },
        { status: 409 },
      );
    }

    const updatedSystem = await db.$transaction(async (tx) => {
      if (!body.isActive) {
        await tx.rolePermission.deleteMany({
          where: { permission: { systemId } },
        });

        await tx.permission.deleteMany({
          where: { systemId },
        });
      }

      return tx.system.update({
        where: { id: systemId },
        data: { isActive: body.isActive },
        select: {
          id: true,
          isActive: true,
          updatedAt: true,
        },
      });
    });

    return NextResponse.json({
      ...updatedSystem,
      removedPermissionCount: body.isActive ? 0 : permissionCount,
      removedRoleAccessCount: body.isActive ? 0 : roleAccessCount,
    });
  } catch (error) {
    console.error("Failed to update system:", error);

    return NextResponse.json(
      { error: "Failed to update system" },
      { status: 500 },
    );
  }
}
