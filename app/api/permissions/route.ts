import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { enforceManagerAccess } from "@/lib/auth/manager-guard";
import { createPermissionSchema } from "@/lib/validation/permissions";

export async function POST(request: Request) {
  const accessError = enforceManagerAccess(request);
  if (accessError) {
    return accessError;
  }

  try {
    const body = await request.json();

    // Verify system exists and is active
    const system = await db.system.findUnique({
      where: { id: body.systemId },
      select: { id: true, isActive: true, name: true },
    });

    if (!system) {
      return NextResponse.json({ error: "System not found" }, { status: 404 });
    }

    if (!system.isActive) {
      return NextResponse.json(
        { error: "Cannot add permissions to inactive system" },
        { status: 400 },
      );
    }

    const parsed = createPermissionSchema.parse(body);

    // Generate key from display name if not provided
    const key =
      parsed.key ||
      parsed.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    // Check for duplicate key
    const existingPermission = await db.permission.findUnique({
      where: { key },
      select: { id: true },
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: "A permission with this key already exists" },
        { status: 409 },
      );
    }

    const created = await db.permission.create({
      data: {
        key,
        displayName: parsed.displayName,
        description: parsed.description?.trim() || null,
        systemId: body.systemId,
      },
      select: {
        id: true,
        key: true,
        displayName: true,
        description: true,
        systemId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
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

    console.error("Failed to create permission:", error);
    return NextResponse.json(
      { error: "Failed to create permission" },
      { status: 500 },
    );
  }
}
