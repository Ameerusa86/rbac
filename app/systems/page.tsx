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
    <div className="p-6">
      <SystemsTable systems={tableRows} />
    </div>
  );
}
