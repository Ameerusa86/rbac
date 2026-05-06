"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchInput } from "./search-input";
import { EditRoleDialog } from "./edit-role-dialog";

type Role = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  permissionCount: number;
  systems: string[];
  permissionIds: number[];
};

type RolesTableProps = {
  roles: Role[];
  systems: string[];
  permissions: {
    id: number;
    displayName: string;
    systemName: string;
  }[];
};

export function RolesTable({ roles, systems, permissions }: RolesTableProps) {
  const [search, setSearch] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("all");

  const filteredRoles = useMemo(() => {
    const value = search.toLowerCase();

    return roles.filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(value) ||
        role.description?.toLowerCase().includes(value);

      const matchesSystem =
        selectedSystem === "all" || role.systems.includes(selectedSystem);

      return matchesSearch && matchesSystem;
    });
  }, [roles, search, selectedSystem]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Roles</h1>

          <p className="text-sm text-muted-foreground">
            Search, filter, and edit RBAC job roles by system.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search roles..."
          />

          <select
            value={selectedSystem}
            onChange={(event) => setSelectedSystem(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring md:w-72"
          >
            <option value="all">All systems</option>

            {systems.map((system) => (
              <option key={system} value={system}>
                {system}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filteredRoles.length} of {roles.length} roles
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Systems</th>
              <th className="px-4 py-3 text-left">Permissions</th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredRoles.map((role) => (
              <tr key={role.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/roles/${role.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {role.name}
                  </Link>
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {role.description || "—"}
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {role.systems.slice(0, 3).map((system) => (
                      <span
                        key={system}
                        className="rounded-full border px-2 py-0.5 text-xs"
                      >
                        {system}
                      </span>
                    ))}

                    {role.systems.length > 3 && (
                      <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        +{role.systems.length - 3}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3">{role.permissionCount}</td>

                <td className="px-4 py-3">{role.isActive ? "Yes" : "No"}</td>

                <td className="px-4 py-3 text-right">
                  <EditRoleDialog
                    role={{
                      id: role.id,
                      name: role.name,
                      description: role.description,
                      isActive: role.isActive,
                      permissionIds: role.permissionIds,
                    }}
                    permissions={permissions}
                  />
                </td>
              </tr>
            ))}

            {filteredRoles.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
