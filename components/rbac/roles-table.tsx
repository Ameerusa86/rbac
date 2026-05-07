"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { SearchInput } from "./search-input";
import { EditRoleDialog } from "./edit-role-dialog";
import { DeleteRoleDialog } from "./delete-role-dialog";
import { formatRoleDescription } from "@/lib/utils";

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
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage job roles and their assigned access permissions.
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          {roles.length} total
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search roles or descriptions"
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

      {/* Result count */}
      {(search || selectedSystem !== "all") && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredRoles.length} of {roles.length} roles
        </p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Role
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                Systems
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Permissions
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredRoles.map((role) => (
              <tr
                key={role.id}
                className="group hover:bg-muted/30 transition-colors"
              >
                {/* Name + description */}
                <td className="px-4 py-3">
                  <Link
                    href={`/roles/${role.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {role.name}
                  </Link>
                  {role.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {formatRoleDescription(role.description).slice(0, 80)}
                    </p>
                  )}
                </td>

                {/* Systems */}
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {role.systems.slice(0, 3).map((system) => (
                      <span
                        key={system}
                        className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {system}
                      </span>
                    ))}
                    {role.systems.length > 3 && (
                      <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                        +{role.systems.length - 3}
                      </span>
                    )}
                    {role.systems.length === 0 && (
                      <span className="text-xs text-muted-foreground/50"></span>
                    )}
                  </div>
                </td>

                {/* Permission count */}
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {role.permissionCount}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {role.isActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border">
                      <XCircle className="h-3 w-3" />
                      Inactive
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <EditRoleDialog
                      role={{
                        id: role.id,
                        name: role.name,
                        description: role.description,
                        isActive: role.isActive,
                        permissionIds: role.permissionIds,
                      }}
                      permissions={permissions}
                      systems={systems}
                    />
                    <DeleteRoleDialog role={{ id: role.id, name: role.name }} />
                  </div>
                </td>
              </tr>
            ))}

            {filteredRoles.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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
