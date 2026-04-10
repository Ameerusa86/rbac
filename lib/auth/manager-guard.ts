import { NextResponse } from "next/server";

export function enforceManagerAccess(request: Request) {
  const devModeEnabled = (process.env.DEV_MANAGER_MODE || "true") === "true";

  if (devModeEnabled) {
    return null;
  }

  const managerHeader = request.headers.get("x-manager-role");
  if (managerHeader === "manager") {
    return null;
  }

  return NextResponse.json(
    {
      error:
        "Manager access required. Set x-manager-role: manager or enable DEV_MANAGER_MODE=true.",
    },
    { status: 403 },
  );
}
