import Link from "next/link";
import { db } from "@/lib/db";

export default async function HomePage() {
  const [roleCount, systemCount, permissionCount, accessLinkCount] =
    await Promise.all([
      db.role.count(),
      db.system.count(),
      db.permission.count(),
      db.rolePermission.count(),
    ]);

  const recentRoles = await db.role.findMany({
    take: 5,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: {
        select: {
          rolePermissions: true,
        },
      },
    },
  });

  return (
    <main className="p-6 space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">RBAC Manager</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Central place to manage job roles, systems, and access permissions
          imported from your RBAC spreadsheet.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardCard title="Roles" value={roleCount} href="/roles" />
        <DashboardCard title="Systems" value={systemCount} href="/systems" />
        <DashboardCard
          title="Permissions"
          value={permissionCount}
          href="/permissions"
        />
        <DashboardCard
          title="Access Links"
          value={accessLinkCount}
          href="/roles"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Manage Roles"
          description="Search roles, filter by system, and add or remove access."
          href="/roles"
        />
        <ActionCard
          title="Review Systems"
          description="See all systems created from your spreadsheet columns."
          href="/systems"
        />
        <ActionCard
          title="Review Permissions"
          description="View all permissions grouped by system."
          href="/permissions"
        />
      </section>

      <section className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">Recently Updated Roles</h2>
        </div>

        <div className="divide-y">
          {recentRoles.map((role) => (
            <Link
              key={role.id}
              href={`/roles/${role.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{role.name}</p>
                <p className="text-muted-foreground">
                  {role.description || "No description"}
                </p>
              </div>

              <span className="text-muted-foreground">
                {role._count.rolePermissions} permissions
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-lg border p-5 hover:bg-muted/50">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Link>
  );
}

function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-lg border p-5 hover:bg-muted/50">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
