import Link from "next/link";
import {
  ArrowRight,
  Grid2x2,
  KeyRound,
  Link2,
  Server,
  Users,
} from "lucide-react";
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
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { rolePermissions: true } },
    },
  });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your role-based access configuration.
        </p>
      </div>

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Roles"
          value={roleCount}
          href="/roles"
          icon={<Users className="h-4 w-4" />}
          description="Defined job roles"
        />
        <StatCard
          title="Systems"
          value={systemCount}
          href="/systems"
          icon={<Server className="h-4 w-4" />}
          description="Source systems"
        />
        <StatCard
          title="Permissions"
          value={permissionCount}
          href="/permissions"
          icon={<KeyRound className="h-4 w-4" />}
          description="Access permissions"
        />
        <StatCard
          title="Access Links"
          value={accessLinkCount}
          href="/roles"
          icon={<Link2 className="h-4 w-4" />}
          description="Role–permission mappings"
        />
      </section>

      {/* Quick links */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Quick Access
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <QuickLink
            title="Manage Roles"
            description="Search, filter, and edit RBAC job roles and their assigned access."
            href="/roles"
            icon={<Users className="h-5 w-5 text-primary" />}
          />
          <QuickLink
            title="Role Matrix"
            description="Spreadsheet view of roles mapped to systems and permissions."
            href="/role-matrix"
            icon={<Grid2x2 className="h-5 w-5 text-primary" />}
          />
          <QuickLink
            title="Review Systems"
            description="View all source systems and their permission counts."
            href="/systems"
            icon={<Server className="h-5 w-5 text-primary" />}
          />
        </div>
      </section>

      {/* Recent roles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Recently Updated
          </h2>
          <Link
            href="/roles"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {recentRoles.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No roles yet.
              </p>
            )}

            {recentRoles.map((role) => (
              <Link
                key={role.id}
                href={`/roles/${role.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{role.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {role.description
                      ? role.description.slice(0, 80) +
                        (role.description.length > 80 ? "…" : "")
                      : "No description"}
                  </p>
                </div>
                <span className="ml-4 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {role._count.rolePermissions} permissions
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
  icon,
  description,
}: {
  title: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-5 hover:border-primary/30 hover:bg-primary/[0.03] transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-lg border bg-background p-2 text-muted-foreground group-hover:border-primary/20 group-hover:text-primary transition-colors">
          {icon}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}

function QuickLink({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border bg-card p-5 hover:border-primary/30 hover:bg-primary/[0.03] transition-colors"
    >
      <div className="mb-3">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
