import { db } from "@/lib/db";
import { RolesTable } from "@/components/rbac/roles-table";
import { formatPermissionLabel } from "@/lib/utils";

export default async function RolesPage() {
  const [roles, systems, permissions] = await Promise.all([
    db.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        rolePermissions: {
          select: {
            permissionId: true,
            permission: {
              select: {
                system: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.system.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    db.permission.findMany({
      where: { system: { isActive: true } },
      orderBy: [{ system: { name: "asc" } }, { displayName: "asc" }],
      select: {
        id: true,
        displayName: true,
        system: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    permissionCount: role.rolePermissions.length,
    permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
    systems: [
      ...new Set(role.rolePermissions.map((rp) => rp.permission.system.name)),
    ],
  }));

  const formattedPermissions = permissions.map((p) => ({
    id: p.id,
    displayName: formatPermissionLabel(p.displayName, p.system.name),
    systemName: p.system.name,
  }));

  return (
    <div className="p-6">
      <RolesTable
        roles={formattedRoles}
        systems={systems.map((system) => system.name)}
        permissions={formattedPermissions}
      />
    </div>
  );
}
