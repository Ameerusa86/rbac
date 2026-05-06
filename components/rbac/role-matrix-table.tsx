"use client";

import Link from "next/link";
import { type ComponentType, useMemo, useState } from "react";
import { CheckCircle2, Layers3, ShieldCheck, XCircle } from "lucide-react";
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

  const totalPermissionMappings = useMemo(
    () =>
      roles.reduce(
        (acc, role) =>
          acc +
          Object.values(role.systems).reduce(
            (innerAcc, permissions) => innerAcc + permissions.length,
            0,
          ),
        0,
      ),
    [roles],
  );

  const activeRoleCount = useMemo(
    () => roles.filter((role) => role.isActive).length,
    [roles],
  );

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

  const systemCoverage = useMemo(() => {
    const counts = new Map<string, number>();

    for (const role of roles) {
      for (const [systemName, permissions] of Object.entries(role.systems)) {
        if (permissions.length > 0) {
          counts.set(systemName, (counts.get(systemName) ?? 0) + 1);
        }
      }
    }

    return counts;
  }, [roles]);

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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Roles" value={roles.length} icon={ShieldCheck} />
        <SummaryCard
          label="Active Roles"
          value={activeRoleCount}
          helper={`${roles.length - activeRoleCount} inactive`}
          icon={CheckCircle2}
        />
        <SummaryCard
          label="Visible Systems"
          value={visibleSystems.length}
          helper={
            selectedSystem === "all" ? "All systems shown" : "Filtered view"
          }
          icon={Layers3}
        />
        <SummaryCard
          label="Permission Mappings"
          value={totalPermissionMappings}
          helper="Role-system assignments"
          icon={Layers3}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search roles"
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{system}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {systemCoverage.get(system) ?? 0}
                    </span>
                  </div>
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
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {role.description || "No description"}
                  </p>
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
                  const previewPermissions = permissions.slice(0, 4);
                  const remainingCount =
                    permissions.length - previewPermissions.length;

                  return (
                    <td
                      key={`${role.id}-${system}`}
                      className="max-w-80 border-r px-4 py-3 align-top last:border-r-0"
                    >
                      {permissions.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {permissions.length} permissions
                          </p>
                          {previewPermissions.map((p) => (
                            <div
                              key={p}
                              className="rounded-lg border bg-muted/40 px-2 py-1 text-xs text-foreground"
                              title={p}
                            >
                              <span className="line-clamp-2 break-words">
                                {p}
                              </span>
                            </div>
                          ))}
                          {remainingCount > 0 && (
                            <div className="rounded-lg border border-dashed bg-background px-2 py-1 text-xs text-muted-foreground">
                              +{remainingCount} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          -
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

type SummaryCardProps = {
  label: string;
  value: number;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
};

function SummaryCard({ label, value, helper, icon: Icon }: SummaryCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
