"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchInput } from "./search-input";

type MatrixRole = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  systems: Record<string, string[]>;
};

type RoleMatrixTableProps = {
  roles: MatrixRole[];
  systems: string[];
};

export function RoleMatrixTable({ roles, systems }: RoleMatrixTableProps) {
  const [search, setSearch] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("all");

  const filteredRoles = useMemo(() => {
    const value = search.toLowerCase();

    return roles.filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(value) ||
        role.description?.toLowerCase().includes(value);

      const matchesSystem =
        selectedSystem === "all" ||
        Boolean(role.systems[selectedSystem]?.length);

      return matchesSearch && matchesSystem;
    });
  }, [roles, search, selectedSystem]);

  const visibleSystems = useMemo(() => {
    if (selectedSystem === "all") {
      return systems;
    }

    return systems.filter((system) => system === selectedSystem);
  }, [systems, selectedSystem]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Role Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Spreadsheet-style view of roles, systems, and assigned access.
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

      <div className="overflow-auto rounded-lg border">
        <table className="min-w-max text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="sticky left-0 z-20 min-w-64 border-r bg-muted/50 px-4 py-3 text-left">
                Role
              </th>

              {visibleSystems.map((system) => (
                <th
                  key={system}
                  className="min-w-72 border-r px-4 py-3 text-left"
                >
                  {system}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredRoles.map((role) => (
              <tr key={role.id} className="border-b last:border-b-0">
                <td className="sticky left-0 z-10 border-r bg-background px-4 py-3 align-top">
                  <Link
                    href={`/roles/${role.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {role.name}
                  </Link>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {role.isActive ? "Active" : "Inactive"}
                  </p>
                </td>

                {visibleSystems.map((system) => {
                  const permissions = role.systems[system] ?? [];

                  return (
                    <td
                      key={`${role.id}-${system}`}
                      className="max-w-80 border-r px-4 py-3 align-top"
                    >
                      {permissions.length > 0 ? (
                        <div className="space-y-1">
                          {permissions.map((permission) => (
                            <div
                              key={permission}
                              className="rounded-md border px-2 py-1 text-xs"
                            >
                              {permission}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {filteredRoles.length === 0 && (
              <tr>
                <td
                  colSpan={visibleSystems.length + 1}
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
