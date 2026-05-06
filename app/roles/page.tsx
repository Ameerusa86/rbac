import { db } from "@/lib/db";
import { RolesTable } from "@/components/rbac/roles-table";

export default async function RolesPage() {
  const roles = await db.role.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      rolePermissions: {
        include: {
          permission: {
            include: {
              system: true,
            },
          },
        },
      },
      _count: {
        select: {
          rolePermissions: true,
        },
      },
    },
  });

  const systems = await db.system.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const permissions = await db.permission.findMany({
    orderBy: [
      {
        system: {
          name: "asc",
        },
      },
      {
        displayName: "asc",
      },
    ],
    include: {
      system: true,
    },
  });

  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    permissionCount: role._count.rolePermissions,
    permissionIds: role.rolePermissions.map(
      (rolePermission) => rolePermission.permissionId,
    ),
    systems: [
      ...new Set(
        role.rolePermissions.map(
          (rolePermission) => rolePermission.permission.system.name,
        ),
      ),
    ],
  }));

  const formattedPermissions = permissions.map((permission) => ({
    id: permission.id,
    displayName: permission.displayName,
    systemName: permission.system.name,
  }));

  return (
    <main className="p-6">
      <RolesTable
        roles={formattedRoles}
        systems={systems.map((system) => system.name)}
        permissions={formattedPermissions}
      />
    </main>
  );
}
