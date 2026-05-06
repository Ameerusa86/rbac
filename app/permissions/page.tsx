import { db } from "@/lib/db";
import { formatPermissionLabel } from "@/lib/utils";
import { CheckCircle2, Layers3, Shield, UsersRound } from "lucide-react";
import { type ComponentType } from "react";

export default async function PermissionsPage() {
  const permissions = await db.permission.findMany({
    orderBy: [{ system: { name: "asc" } }, { displayName: "asc" }],
    include: {
      system: true,
      _count: { select: { rolePermissions: true } },
    },
  });

  const systemCount = new Set(permissions.map((p) => p.system.name)).size;
  const assignedCount = permissions.filter(
    (p) => p._count.rolePermissions > 0,
  ).length;
  const unassignedCount = permissions.length - assignedCount;

  const topSystem = Object.entries(
    permissions.reduce<Record<string, number>>((acc, permission) => {
      acc[permission.system.name] = (acc[permission.system.name] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access permissions imported from the RBAC spreadsheet.
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          {permissions.length} total
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Systems"
          value={systemCount}
          helper="With mapped permissions"
          icon={Layers3}
        />
        <StatCard
          label="Assigned"
          value={assignedCount}
          helper="Used by at least one role"
          icon={CheckCircle2}
        />
        <StatCard
          label="Unassigned"
          value={unassignedCount}
          helper="No role currently uses these"
          icon={Shield}
        />
        <StatCard
          label="Largest System"
          value={topSystem?.[0] ?? "-"}
          helper={topSystem ? `${topSystem[1]} permissions` : "No data"}
          icon={UsersRound}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                System
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Permission
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Used by Roles
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Adoption
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {permissions.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                    {p.system.name}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  <p>{formatPermissionLabel(p.displayName, p.system.name)}</p>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {p._count.rolePermissions}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p._count.rolePermissions > 5 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      High
                    </span>
                  ) : p._count.rolePermissions > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                      Medium
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Not used
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {permissions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No permissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
};

function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <p className="mt-2 line-clamp-1 text-xl font-semibold tracking-tight">
        {value}
      </p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
