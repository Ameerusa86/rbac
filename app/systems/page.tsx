import { db } from "@/lib/db";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function SystemsPage() {
  const systems = await db.system.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { permissions: true } } },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Source systems imported from your RBAC spreadsheet columns.
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          {systems.length} total
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
                Permissions
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {systems.map((system) => (
              <tr
                key={system.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium">{system.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {system._count.permissions}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {system.isActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      <XCircle className="h-3 w-3" />
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {systems.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No systems found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
