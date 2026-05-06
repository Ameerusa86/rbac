import { db } from "@/lib/db";

export default async function PermissionsPage() {
  const permissions = await db.permission.findMany({
    orderBy: [{ system: { name: "asc" } }, { displayName: "asc" }],
    include: {
      system: true,
      _count: { select: { rolePermissions: true } },
    },
  });

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
                <td className="px-4 py-3 font-medium">{p.displayName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {p._count.rolePermissions}
                  </span>
                </td>
              </tr>
            ))}

            {permissions.length === 0 && (
              <tr>
                <td
                  colSpan={3}
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
