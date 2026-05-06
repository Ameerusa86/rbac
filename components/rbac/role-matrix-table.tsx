"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
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
    if (selectedSystem === "all") return systems;
    return systems.filter((s) => s === selectedSystem);
  }, [systems, selectedSystem]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Role Matrix</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spreadsheet-style view of roles mapped to systems and permissions.
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          {roles.length} roles
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search rolesâ€¦"
        />

        <select
          value={selectedSystem}
          onChange={(e) => setSelectedSystem(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring md:w-64"
        >
          <option value="all">All systems</option>
          {systems.map((system) => (
            <option key={system} value={system}>
              {system}
            </option>
          ))}
        </select>
      </div>

      {(search || selectedSystem !== "all") && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredRoles.length} of {roles.length} roles
        </p>
      )}

      {/* Matrix table */}
      <div className="overflow-auto rounded-xl border bg-card">
        <table className="min-w-max text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-20 min-w-64 border-r bg-muted/40 px-4 py-3 text-left font-medium text-muted-foreground">
                Role
              </th>

              {visibleSystems.map((system) => (
                <th
                  key={system}
                  className="min-w-72 border-r px-4 py-3 text-left font-medium text-muted-foreground last:border-r-0"
                >
                  {system}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredRoles.map((role) => (
              <tr key={role.id} className="hover:bg-muted/20 transition-colors">
                {/* Role name cell */}
                <td className="sticky left-0 z-10 border-r bg-card px-4 py-3 align-top">
                  <Link
                    href={`/roles/${role.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {role.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {role.isActive ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </>
                    )}
                  </p>
                </td>

                {/* System permission cells */}
                {visibleSystems.map((system) => {
                  const permissions = role.systems[system] ?? [];

                  return (
                    <td
                      key={`${role.id}-${system}`}
                      className="max-w-80 border-r px-4 py-3 align-top last:border-r-0"
                    >
                      {permissions.length > 0 ? (
                        <div className="space-y-1">
                          {permissions.map((p) => (
                            <div
                              key={p}
                              className="rounded-lg border bg-muted/40 px-2 py-1 text-xs text-foreground"
                            >
                              {p}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          â€”
                        </span>
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
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No roles match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
