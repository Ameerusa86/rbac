import { db } from "@/lib/db";

export default async function PermissionsPage() {
  const permissions = await db.permission.findMany({
    orderBy: [
      {
        system: {
          name: "asc",
        },
      },
      {
        displayName: "asc",
      },
    ],
    include: {
      system: true,
      _count: {
        select: {
          rolePermissions: true,
        },
      },
    },
  });

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Access permissions imported from the RBAC spreadsheet.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">System</th>
              <th className="px-4 py-3 text-left">Permission</th>
              <th className="px-4 py-3 text-left">Roles Using It</th>
            </tr>
          </thead>

          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium">
                  {permission.system.name}
                </td>
                <td className="px-4 py-3">{permission.displayName}</td>
                <td className="px-4 py-3">
                  {permission._count.rolePermissions}
                </td>
              </tr>
            ))}

            {permissions.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No permissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
