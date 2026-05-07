import { SystemsTable } from "@/components/rbac/systems-table";
import { db } from "@/lib/db";

export default async function SystemsPage() {
  const systems = await db.system.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { permissions: true } },
      permissions: {
        select: {
          rolePermissions: {
            select: { roleId: true },
          },
        },
      },
    },
  });

  const tableRows = systems.map((system) => {
    const roleIds = new Set<number>();

    for (const permission of system.permissions) {
      for (const rolePermission of permission.rolePermissions) {
        roleIds.add(rolePermission.roleId);
      }
    }

    return {
      id: system.id,
      name: system.name,
      description: system.description,
      isActive: system.isActive,
      permissionCount: system._count.permissions,
      rolesUsingCount: roleIds.size,
      updatedAt: system.updatedAt.toISOString(),
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage source systems and their associated permissions.
          </p>
        </div>
      </div>
      <SystemsTable systems={tableRows} />
    </div>
  );
}
