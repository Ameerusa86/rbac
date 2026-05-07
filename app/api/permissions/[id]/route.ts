import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { updatePermissionSchema } from "@/lib/validation/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const permissionId = Number(id);

  if (Number.isNaN(permissionId)) {
    return NextResponse.json({ error: "Invalid permission ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = updatePermissionSchema.parse(body);

    // If key is being changed, ensure uniqueness
    if (parsed.key) {
      const conflict = await db.permission.findFirst({
        where: { key: parsed.key, NOT: { id: permissionId } },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "A permission with this key already exists" },
          { status: 409 },
        );
      }
    }

    const updated = await db.permission.update({
      where: { id: permissionId },
      data: {
        ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
        ...(parsed.key ? { key: parsed.key } : {}),
        description:
          parsed.description === null || parsed.description === ""
            ? null
            : (parsed.description?.trim() ?? undefined),
      },
      select: {
        id: true,
        key: true,
        displayName: true,
        description: true,
        systemId: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error("Failed to update permission:", error);
    return NextResponse.json(
      { error: "Failed to update permission" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const permissionId = Number(id);

  if (Number.isNaN(permissionId)) {
    return NextResponse.json({ error: "Invalid permission ID" }, { status: 400 });
  }

  try {
    const roleCount = await db.rolePermission.count({ where: { permissionId } });

    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { permissionId } });
      await tx.permission.delete({ where: { id: permissionId } });
    });

    return NextResponse.json({ success: true, removedFromRoles: roleCount });
  } catch (error) {
    console.error("Failed to delete permission:", error);
    return NextResponse.json(
      { error: "Failed to delete permission" },
      { status: 500 },
    );
  }
}
