import { db } from "@/lib/db";
import { RolesTable } from "@/components/rbac/roles-table";

export default async function RolesPage() {
  const roles = await db.role.findMany({
    orderBy: { name: "asc" },
    include: {
      rolePermissions: {
        include: { permission: { include: { system: true } } },
      },
      _count: { select: { rolePermissions: true } },
    },
  });

  const systems = await db.system.findMany({ orderBy: { name: "asc" } });

  const permissions = await db.permission.findMany({
    orderBy: [{ system: { name: "asc" } }, { displayName: "asc" }],
    include: { system: true },
  });

  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    permissionCount: role._count.rolePermissions,
    permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
    systems: [
      ...new Set(role.rolePermissions.map((rp) => rp.permission.system.name)),
    ],
  }));

  const formattedPermissions = permissions.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    systemName: p.system.name,
  }));

  return (
    <div className="p-6">
      <RolesTable
        roles={formattedRoles}
        systems={systems.map((s) => s.name)}
        permissions={formattedPermissions}
      />
    </div>
  );
}
