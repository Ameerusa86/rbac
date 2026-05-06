import { RoleMatrixTable } from "@/components/rbac/role-matrix-table";
import { db } from "@/lib/db";

export default async function RoleMatrixPage() {
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
    },
  });

  const systems = await db.system.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const formattedRoles = roles.map((role) => {
    const systemMap = new Map<string, string[]>();

    for (const rolePermission of role.rolePermissions) {
      const systemName = rolePermission.permission.system.name;
      const permissionName = rolePermission.permission.displayName;

      if (!systemMap.has(systemName)) {
        systemMap.set(systemName, []);
      }

      systemMap.get(systemName)?.push(permissionName);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      systems: Object.fromEntries(systemMap),
    };
  });

  return (
    <div className="p-6">
      <RoleMatrixTable
        roles={formattedRoles}
        systems={systems.map((system) => system.name)}
      />
    </div>
  );
}
