"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCheck, PencilLine, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Permission = {
  id: number;
  displayName: string;
  systemName: string;
};

type EditRoleDialogProps = {
  role: {
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
    permissionIds: number[];
  };
  permissions: Permission[];
};

export function EditRoleDialog({ role, permissions }: EditRoleDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [isActive, setIsActive] = useState(role.isActive);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    role.permissionIds,
  );
  const [permissionSearch, setPermissionSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const groupedPermissions = useMemo(() => {
    const search = permissionSearch.toLowerCase();
    return permissions
      .filter(
        (p) =>
          p.displayName.toLowerCase().includes(search) ||
          p.systemName.toLowerCase().includes(search),
      )
      .reduce<Record<string, Permission[]>>((groups, p) => {
        if (!groups[p.systemName]) groups[p.systemName] = [];
        groups[p.systemName].push(p);
        return groups;
      }, {});
  }, [permissions, permissionSearch]);

  function togglePermission(id: number) {
    setSelectedPermissionIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function toggleSystemAll(systemPermissions: Permission[]) {
    const ids = systemPermissions.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermissionIds.includes(id));
    if (allSelected) {
      setSelectedPermissionIds((cur) => cur.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPermissionIds((cur) => [
        ...cur,
        ...ids.filter((id) => !cur.includes(id)),
      ]);
    }
  }

  function handleOpen() {
    setName(role.name);
    const rawDesc = role.description ?? "";
    setDescription(
      rawDesc.startsWith("Default Manager: ")
        ? rawDesc.slice("Default Manager: ".length)
        : rawDesc,
    );
    setIsActive(role.isActive);
    setSelectedPermissionIds(role.permissionIds);
    setPermissionSearch("");
    setError("");
    setOpen(true);
  }

  function handleClose() {
    if (!isSaving) setOpen(false);
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          isActive,
          permissionIds: selectedPermissionIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update role.");
      }
      setOpen(false);
      toast.success("Role updated successfully");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-shadow";

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={handleOpen}
      >
        <PencilLine className="h-3.5 w-3.5" />
        <span className="sr-only">Edit {role.name}</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-2xl border bg-card shadow-2xl">
            {/* ── Header ── */}
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <PencilLine className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-none">
                    Edit Role
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {role.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Two-panel body ── */}
            <div className="flex min-h-0 flex-1 divide-x">
              {/* Left — role details */}
              <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto p-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Role Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. HR Manager"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="Optional description…"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Active toggle */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsActive((v) => !v)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-3 text-sm transition-colors ${
                      isActive
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border bg-background text-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    {/* pill toggle */}
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        isActive ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          isActive ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>
                </div>

                {/* Summary */}
                <div className="mt-auto rounded-lg border bg-muted/30 p-3.5 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Permissions</span>
                    <span className="font-medium text-foreground">
                      {selectedPermissionIds.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Systems covered</span>
                    <span className="font-medium text-foreground">
                      {
                        new Set(
                          permissions
                            .filter((p) => selectedPermissionIds.includes(p.id))
                            .map((p) => p.systemName),
                        ).size
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Right — permissions */}
              <div className="flex flex-1 flex-col overflow-hidden p-6">
                {/* Permissions header */}
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Permissions</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedPermissionIds.length} of {permissions.length}{" "}
                      selected
                    </p>
                  </div>
                  {selectedPermissionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPermissionIds([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative mb-3 shrink-0">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder="Search systems or permissions…"
                    className={`${inputClass} pl-9`}
                  />
                  {permissionSearch && (
                    <button
                      type="button"
                      onClick={() => setPermissionSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Grouped list */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {Object.entries(groupedPermissions).map(
                    ([systemName, systemPerms]) => {
                      const allSelected = systemPerms.every((p) =>
                        selectedPermissionIds.includes(p.id),
                      );
                      const someSelected = systemPerms.some((p) =>
                        selectedPermissionIds.includes(p.id),
                      );
                      return (
                        <div key={systemName}>
                          {/* System header */}
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {systemName}
                            </p>
                            <button
                              type="button"
                              onClick={() => toggleSystemAll(systemPerms)}
                              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                                allSelected
                                  ? "text-primary hover:text-primary/70"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <CheckCheck className="h-3 w-3" />
                              {allSelected
                                ? "Deselect all"
                                : someSelected
                                  ? "Select rest"
                                  : "Select all"}
                            </button>
                          </div>

                          {/* Permission checkboxes */}
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {systemPerms.map((p) => {
                              const checked = selectedPermissionIds.includes(
                                p.id,
                              );
                              return (
                                <label
                                  key={p.id}
                                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                                    checked
                                      ? "border-primary/30 bg-primary/8 text-foreground"
                                      : "border bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(p.id)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded accent-primary"
                                  />
                                  <span className="leading-snug">
                                    {p.displayName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}

                  {Object.keys(groupedPermissions).length === 0 && (
                    <div className="flex h-full items-center justify-center py-16 text-center">
                      <p className="text-sm text-muted-foreground">
                        No permissions match your search.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex shrink-0 items-center justify-between border-t px-6 py-4">
              <div className="flex-1">
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
