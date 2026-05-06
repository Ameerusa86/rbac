"use client";

import { type ComponentType, useMemo, useState } from "react";
import {
  ArrowDownUp,
  CheckCircle2,
  Shield,
  UsersRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SearchInput } from "./search-input";

type SystemRow = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  permissionCount: number;
  rolesUsingCount: number;
  updatedAt: string;
};

type SortKey = "name" | "permissions" | "roles" | "updated";

type SystemsTableProps = {
  systems: SystemRow[];
};

type DeactivationImpact = {
  systemId: number;
  systemName: string;
  permissionCount: number;
  roleAccessCount: number;
};

export function SystemsTable({ systems }: SystemsTableProps) {
  const [rows, setRows] = useState<SystemRow[]>(systems);
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);
  const [pendingImpact, setPendingImpact] = useState<DeactivationImpact | null>(
    null,
  );
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("permissions");

  const totalPermissions = useMemo(
    () => rows.reduce((acc, system) => acc + system.permissionCount, 0),
    [rows],
  );
  const activeCount = useMemo(
    () => rows.filter((system) => system.isActive).length,
    [rows],
  );
  const maxPermissionCount = useMemo(
    () => Math.max(1, ...rows.map((system) => system.permissionCount)),
    [rows],
  );

  const topConnectedSystem = useMemo(() => {
    if (rows.length === 0) return null;
    return [...rows].sort((a, b) => b.rolesUsingCount - a.rolesUsingCount)[0];
  }, [rows]);

  async function applySystemActiveState(
    systemId: number,
    isActive: boolean,
    confirmCascade = false,
  ) {
    return fetch(`/api/systems/${systemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive, confirmCascade }),
    });
  }

  async function setSystemActiveState(systemId: number, isActive: boolean) {
    setUpdatingIds((cur) => [...cur, systemId]);

    try {
      let response = await applySystemActiveState(systemId, isActive);

      if (!response.ok && response.status === 409 && !isActive) {
        const conflict = await response.json().catch(() => ({}));
        if (conflict.requiresConfirmation) {
          const currentSystem = rows.find((row) => row.id === systemId);
          setPendingImpact({
            systemId,
            systemName: currentSystem?.name ?? "this system",
            permissionCount: conflict.impact?.permissionCount ?? 0,
            roleAccessCount: conflict.impact?.roleAccessCount ?? 0,
          });
          return;
        }
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update system");
      }

      const payload = await response.json().catch(() => ({}));

      setRows((cur) =>
        cur.map((system) =>
          system.id === systemId
            ? {
                ...system,
                isActive,
                updatedAt: payload.updatedAt ?? new Date().toISOString(),
                permissionCount: isActive ? system.permissionCount : 0,
                rolesUsingCount: isActive ? system.rolesUsingCount : 0,
              }
            : system,
        ),
      );
      toast.success(isActive ? "System activated" : "System deactivated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update system",
      );
    } finally {
      setUpdatingIds((cur) => cur.filter((id) => id !== systemId));
    }
  }

  async function handleConfirmDeactivate() {
    if (!pendingImpact) return;

    setConfirmingDeactivate(true);
    setUpdatingIds((cur) => [...cur, pendingImpact.systemId]);

    try {
      const response = await applySystemActiveState(
        pendingImpact.systemId,
        false,
        true,
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to deactivate system");
      }

      const payload = await response.json().catch(() => ({}));

      setRows((cur) =>
        cur.map((system) =>
          system.id === pendingImpact.systemId
            ? {
                ...system,
                isActive: false,
                updatedAt: payload.updatedAt ?? new Date().toISOString(),
                permissionCount: 0,
                rolesUsingCount: 0,
              }
            : system,
        ),
      );

      toast.success("System deactivated and related access removed");
      setPendingImpact(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate system",
      );
    } finally {
      setConfirmingDeactivate(false);
      setUpdatingIds((cur) =>
        cur.filter((id) => id !== pendingImpact.systemId),
      );
    }
  }

  const filteredSystems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const filtered = rows.filter((system) => {
      const matchesSearch =
        needle.length === 0 ||
        system.name.toLowerCase().includes(needle) ||
        (system.description ?? "").toLowerCase().includes(needle);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? system.isActive : !system.isActive);

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "permissions")
        return b.permissionCount - a.permissionCount;
      if (sortKey === "roles") return b.rolesUsingCount - a.rolesUsingCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [rows, search, statusFilter, sortKey]);

  return (
    <div className="space-y-6">
      <AlertDialog
        open={Boolean(pendingImpact)}
        onOpenChange={(open) => {
          if (!open && !confirmingDeactivate) {
            setPendingImpact(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate system?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove permissions and role-access mappings
              for{" "}
              <span className="font-medium text-foreground">
                {" "}
                {pendingImpact?.systemName}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p>
              Permissions to delete:{" "}
              <span className="font-medium">
                {pendingImpact?.permissionCount ?? 0}
              </span>
            </p>
            <p>
              Role-access mappings to delete:{" "}
              <span className="font-medium">
                {pendingImpact?.roleAccessCount ?? 0}
              </span>
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmingDeactivate}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDeactivate();
              }}
              disabled={confirmingDeactivate}
              className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
            >
              {confirmingDeactivate
                ? "Deactivating..."
                : "Deactivate and remove access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore system coverage, permission density, and role adoption.
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          {rows.length} total systems
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Systems" value={activeCount} icon={Shield} />
        <MetricCard
          label="Total Permissions"
          value={totalPermissions}
          icon={ArrowDownUp}
        />
        <MetricCard
          label="Avg Permissions/System"
          value={
            systems.length
              ? Number((totalPermissions / systems.length).toFixed(1))
              : 0
          }
          icon={CheckCircle2}
        />
        <MetricCard
          label="Most Adopted"
          value={topConnectedSystem?.name ?? "-"}
          helper={
            topConnectedSystem
              ? `${topConnectedSystem.rolesUsingCount} roles`
              : "No data"
          }
          icon={UsersRound}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search systems or descriptions..."
        />

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "active" | "inactive",
              )
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="all">All status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="permissions">Sort: Permissions</option>
            <option value="roles">Sort: Role adoption</option>
            <option value="updated">Sort: Recently updated</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
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
                Role Adoption
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Updated
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredSystems.map((system) => (
              <tr
                key={system.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{system.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {system.description || "No description"}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {system.permissionCount}
                    </span>
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(system.permissionCount / maxPermissionCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
                    {system.rolesUsingCount} roles
                  </span>
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(system.updatedAt).toLocaleDateString()}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {system.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </span>
                    )}

                    <Button
                      type="button"
                      size="xs"
                      variant={system.isActive ? "outline" : "default"}
                      disabled={updatingIds.includes(system.id)}
                      onClick={() =>
                        setSystemActiveState(system.id, !system.isActive)
                      }
                    >
                      {updatingIds.includes(system.id)
                        ? "Updating..."
                        : system.isActive
                          ? "Deactivate"
                          : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredSystems.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No systems match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
};

function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
