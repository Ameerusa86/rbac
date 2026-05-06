import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RoleDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const roleId = Number(id);

  if (Number.isNaN(roleId)) {
    notFound();
  }

  const role = await db.role.findUnique({
    where: {
      id: roleId,
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
        orderBy: {
          permission: {
            displayName: "asc",
          },
        },
      },
    },
  });

  if (!role) {
    notFound();
  }

  const groupedPermissions = role.rolePermissions.reduce<
    Record<string, string[]>
  >((groups, rolePermission) => {
    const systemName = rolePermission.permission.system.name;

    if (!groups[systemName]) {
      groups[systemName] = [];
    }

    groups[systemName].push(rolePermission.permission.displayName);

    return groups;
  }, {});

  return (
    <main className="p-6 space-y-6">
      <div className="space-y-2">
        <Link href="/roles" className="text-sm text-blue-600 hover:underline">
          ← Back to Roles
        </Link>

        <div>
          <h1 className="text-2xl font-semibold">{role.name}</h1>

          {role.description ? (
            <p className="text-sm text-muted-foreground">{role.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description available.
            </p>
          )}
        </div>
      </div>

      <section className="grid gap-4">
        {Object.entries(groupedPermissions).map(([systemName, permissions]) => (
          <div key={systemName} className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">{systemName}</h2>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
