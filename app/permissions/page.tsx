import { db } from "@/lib/db";
import { PermissionsTable } from "@/components/rbac/permissions-table";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const [rawPermissions, systems] = await Promise.all([
    db.permission.findMany({
      orderBy: [{ system: { name: "asc" } }, { displayName: "asc" }],
      select: {
        id: true,
        key: true,
        displayName: true,
        description: true,
        systemId: true,
        system: { select: { id: true, name: true } },
        _count: { select: { rolePermissions: true } },
      },
    }),
    db.system.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const permissions = rawPermissions.map((p) => ({
    id: p.id,
    key: p.key,
    displayName: p.displayName,
    description: p.description,
    systemId: p.systemId,
    systemName: p.system.name,
    roleCount: p._count.rolePermissions,
  }));

  const assigned = rawPermissions.filter(
    (p) => p._count.rolePermissions > 0,
  ).length;

  return (
    <div className="p-6">
      <PermissionsTable
        permissions={permissions}
        systems={systems}
        stats={{
          total: permissions.length,
          assigned,
          systemCount: new Set(permissions.map((p) => p.systemId)).size,
        }}
      />
    </div>
  );
}
