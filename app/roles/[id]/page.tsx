import { db } from "@/lib/db";
import { formatPermissionLabel } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, XCircle } from "lucide-react";

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
            <h1 className="text-2xl font-semibold tracking-tight">
              {role.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role.description ?? "No description available."}
            </p>
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
      <div className="flex gap-4 text-sm">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Permissions</p>
          <p className="mt-1 text-xl font-semibold">{totalPermissions}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Systems</p>
          <p className="mt-1 text-xl font-semibold">{systemCount}</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(groupedPermissions).map(([systemName, perms]) => (
            <div key={systemName} className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">{systemName}</h2>
              <ul className="space-y-1.5">
                {perms.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
