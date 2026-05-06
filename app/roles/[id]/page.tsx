import { db } from "@/lib/db";
import { formatPermissionLabel } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Layers3,
  XCircle,
} from "lucide-react";

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
    where: { id: roleId },
    include: {
      rolePermissions: {
        include: {
          permission: { include: { system: true } },
        },
        orderBy: { permission: { displayName: "asc" } },
      },
    },
  });

  if (!role) {
    notFound();
  }

  const groupedPermissions = role.rolePermissions.reduce<
    Record<string, string[]>
  >((groups, rp) => {
    const sys = rp.permission.system.name;
    if (!groups[sys]) groups[sys] = [];
    groups[sys].push(formatPermissionLabel(rp.permission.displayName, sys));
    return groups;
  }, {});

  const totalPermissions = role.rolePermissions.length;
  const systemCount = Object.keys(groupedPermissions).length;
  const sortedSystemGroups = Object.entries(groupedPermissions).sort(
    ([aSystem, aPermissions], [bSystem, bPermissions]) => {
      if (bPermissions.length !== aPermissions.length) {
        return bPermissions.length - aPermissions.length;
      }

      return aSystem.localeCompare(bSystem);
    },
  );

  const topSystem = sortedSystemGroups[0];
  const createdDate = role.createdAt.toLocaleDateString();
  const updatedDate = role.updatedAt.toLocaleDateString();

  return (
    <div className="p-6 space-y-6">
      {/* Back + header */}
      <div className="space-y-4">
        <Link
          href="/roles"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Roles
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {role.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role.description ?? "No description available."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
                <CalendarDays className="h-3 w-3" />
                Created {createdDate}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
                <CalendarDays className="h-3 w-3" />
                Updated {updatedDate}
              </span>
            </div>
          </div>

          {role.isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border px-3 py-1 text-xs font-medium text-muted-foreground">
              <XCircle className="h-3 w-3" />
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Permissions
          </p>
          <p className="mt-2 text-2xl font-semibold">{totalPermissions}</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Systems
          </p>
          <p className="mt-2 text-2xl font-semibold">{systemCount}</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Largest System
          </p>
          <p className="mt-2 truncate text-base font-semibold">
            {topSystem?.[0] ?? "-"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {topSystem ? `${topSystem[1].length} permissions` : "No data"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <p className="mt-2 text-base font-semibold">
            {role.isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      {/* Permission groups */}
      {Object.keys(groupedPermissions).length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            No permissions assigned.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Access by System
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              <Layers3 className="h-3 w-3" />
              Sorted by permission count
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {sortedSystemGroups.map(([systemName, perms]) => (
              <div key={systemName} className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold">
                    {systemName}
                  </h3>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {perms.length}
                  </span>
                </div>

                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {perms.map((p) => (
                    <li
                      key={p}
                      className="rounded-lg border bg-muted/20 px-2.5 py-1.5 text-sm text-muted-foreground"
                    >
                      <span className="line-clamp-2 break-words" title={p}>
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
