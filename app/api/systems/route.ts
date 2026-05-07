import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { enforceManagerAccess } from "@/lib/auth/manager-guard";
import { createSystemSchema } from "@/lib/validation/systems";

export async function POST(request: Request) {
  const accessError = enforceManagerAccess(request);
  if (accessError) {
    return accessError;
  }

  try {
    const body = await request.json();
    const parsed = createSystemSchema.parse(body);

    // Check for duplicate name
    const existing = await db.system.findUnique({
      where: { name: parsed.name.trim() },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A system with this name already exists" },
        { status: 409 },
      );
    }

    const created = await db.system.create({
      data: {
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        isActive: parsed.isActive,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    console.error("Failed to create system:", error);
    return NextResponse.json(
      { error: "Failed to create system" },
      { status: 500 },
    );
  }
}
