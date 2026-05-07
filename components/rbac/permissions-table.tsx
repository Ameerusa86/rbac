"use client";

import { useRouter } from "next/navigation";
import { type ComponentType, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Layers3,
  Pencil,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { SearchInput } from "./search-input";

export type PermissionRow = {
  id: number;
  key: string;
  displayName: string;
  description: string | null;
  systemId: number;
  systemName: string;
  roleCount: number;
};

export type SystemOption = {
  id: number;
  name: string;
};

export type PermissionStats = {
  total: number;
  assigned: number;
  systemCount: number;
};

type PermissionsTableProps = {
  permissions: PermissionRow[];
  systems: SystemOption[];
  stats: PermissionStats;
};

// Strip system-name prefix that makes every row repeat the system name
function cleanLabel(displayName: string, systemName: string): string {
  const prefix = `${systemName}:`;
  if (displayName.toLowerCase().startsWith(prefix.toLowerCase())) {
    const trimmed = displayName.slice(prefix.length).trim();
    return trimmed || displayName;
  }
  const colonIndex = displayName.indexOf(":");
  if (colonIndex > -1) {
    const trimmed = displayName.slice(colonIndex + 1).trim();
    return trimmed || displayName;
  }
  return displayName;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50";

export function PermissionsTable({
  permissions,
  systems,
  stats,
}: PermissionsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<PermissionRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<PermissionRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add dialog state
  const [addTarget, setAddTarget] = useState<SystemOption | null>(null);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  // ── Filtering + grouping ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return permissions.filter((p) => {
      if (systemFilter !== "all" && p.systemId !== Number(systemFilter))
        return false;
      if (
        term &&
        !p.displayName.toLowerCase().includes(term) &&
        !p.key.toLowerCase().includes(term) &&
        !p.description?.toLowerCase().includes(term) &&
        !p.systemName.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [permissions, search, systemFilter]);

  const grouped = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; perms: PermissionRow[] }
    >();
    for (const p of filtered) {
      if (!map.has(p.systemId)) {
        map.set(p.systemId, { id: p.systemId, name: p.systemName, perms: [] });
      }
      map.get(p.systemId)!.perms.push(p);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // ── Actions ──────────────────────────────────────────────────────────
  function openEdit(p: PermissionRow) {
    setEditTarget(p);
    setEditName(cleanLabel(p.displayName, p.systemName));
    setEditKey(p.key);
    setEditDesc(p.description ?? "");
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editName.trim()) {
      toast.error("Display name is required");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/permissions/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editName.trim(),
          key: editKey.trim() || undefined,
          description: editDesc.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update permission");
      }
      toast.success("Permission updated");
      setEditTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update permission",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/permissions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete permission");
      }
      toast.success(
        `"${cleanLabel(deleteTarget.displayName, deleteTarget.systemName)}" deleted`,
      );
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete permission",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function openAdd(system: SystemOption) {
    setAddTarget(system);
    setAddName("");
    setAddDesc("");
  }

  async function handleAdd() {
    if (!addTarget) return;
    if (!addName.trim()) {
      toast.error("Permission name is required");
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId: addTarget.id,
          displayName: addName.trim(),
          description: addDesc.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create permission");
      }
      const { data } = await res.json();
      toast.success(`"${data.displayName}" added to ${addTarget.name}`);
      setAddTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create permission",
      );
    } finally {
      setIsAdding(false);
    }
  }

  function toggleCollapse(systemId: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(systemId) ? next.delete(systemId) : next.add(systemId);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access permissions grouped by system. Add, edit, or remove entries
            here.
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
          {stats.total} total
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Systems"
          value={stats.systemCount}
          helper="With permissions"
          icon={Layers3}
        />
        <StatCard
          label="Assigned"
          value={stats.assigned}
          helper="Used by ≥1 role"
          icon={CheckCircle2}
        />
        <StatCard
          label="Unused"
          value={stats.total - stats.assigned}
          helper="Not yet assigned to any role"
          icon={Shield}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search permissions…"
        />
        <select
          value={systemFilter}
          onChange={(e) => setSystemFilter(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring sm:w-60"
        >
          <option value="all">All systems</option>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {isPending && (
          <span className="text-xs text-muted-foreground">Refreshing…</span>
        )}
      </div>

      {search || systemFilter !== "all" ? (
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {permissions.length} permissions
        </p>
      ) : null}

      {/* Grouped sections */}
      <div className="space-y-4">
        {grouped.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No permissions match your filters.
          </div>
        )}

        {grouped.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const systemOption = systems.find((s) => s.id === group.id) ?? {
            id: group.id,
            name: group.name,
          };

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              {/* System group header */}
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.id)}
                  className="flex items-center gap-2 text-left"
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isCollapsed ? "" : "rotate-90"
                    }`}
                  />
                  <span className="font-semibold">{group.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {group.perms.length}
                  </span>
                </button>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => openAdd(systemOption)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Permission
                </Button>
              </div>

              {/* Permission rows */}
              {!isCollapsed && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">
                        Permission
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Key</th>
                      <th className="px-4 py-2 text-left font-medium">Roles</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.perms.map((p) => (
                      <tr
                        key={p.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {cleanLabel(p.displayName, group.name)}
                          </p>
                          {p.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {p.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {p.key}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                            {p.roleCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Edit dialog ──────────────────────────────────────────────── */}
      <AlertDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Permission</AlertDialogTitle>
            <AlertDialogDescription>
              Update the display name, key, or description for this permission.
              Changes will be reflected everywhere this permission is used.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <Field label="Display Name *">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isSaving}
                className={inputCls}
              />
            </Field>
            <Field label="Key">
              <input
                type="text"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                disabled={isSaving}
                placeholder="auto-generated if empty"
                className={`${inputCls} font-mono`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Lowercase letters, numbers, dots, dashes, underscores only.
              </p>
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                disabled={isSaving}
                placeholder="What does this permission allow?"
                className={inputCls}
              />
            </Field>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveEdit} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete dialog ────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permission</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You are about to delete{" "}
                  <span className="font-medium text-foreground">
                    &ldquo;
                    {deleteTarget
                      ? cleanLabel(
                          deleteTarget.displayName,
                          deleteTarget.systemName,
                        )
                      : ""}
                    &rdquo;
                  </span>
                  .
                </p>
                {deleteTarget && deleteTarget.roleCount > 0 && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                    This permission is assigned to{" "}
                    <strong>{deleteTarget.roleCount}</strong>{" "}
                    {deleteTarget.roleCount === 1 ? "role" : "roles"}. Those
                    assignments will also be removed.
                  </p>
                )}
                <p>This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add permission dialog ────────────────────────────────────── */}
      <AlertDialog
        open={!!addTarget}
        onOpenChange={(open) => !open && setAddTarget(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Add Permission to {addTarget?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Create a new permission that can be assigned to roles.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <Field label="Permission Name *">
              <input
                type="text"
                placeholder="e.g. View Reports"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                disabled={isAdding}
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                placeholder="What does this permission allow?"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                disabled={isAdding}
                className={inputCls}
              />
            </Field>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAdding}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdd} disabled={isAdding}>
              {isAdding ? "Creating…" : "Create Permission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
};

function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">
        {value.toLocaleString()}
      </p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
