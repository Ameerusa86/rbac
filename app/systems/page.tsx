import { db } from "@/lib/db";

export default async function SystemsPage() {
  const systems = await db.system.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          permissions: true,
        },
      },
    },
  });

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Systems</h1>
        <p className="text-sm text-muted-foreground">
          Systems imported from your RBAC spreadsheet columns.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">System</th>
              <th className="px-4 py-3 text-left">Permissions</th>
              <th className="px-4 py-3 text-left">Active</th>
            </tr>
          </thead>

          <tbody>
            {systems.map((system) => (
              <tr key={system.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">{system.name}</td>
                <td className="px-4 py-3">{system._count.permissions}</td>
                <td className="px-4 py-3">{system.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}

            {systems.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No systems found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
