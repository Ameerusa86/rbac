"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PencilLine, Search, X } from "lucide-react";
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

  function handleClose() {
    if (!isSaving) {
      setOpen(false);
      setError("");
    }
  }

  async function handleSave() {
    setError("");

    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }

    setIsSaving(true);

    const response = await fetch(`/api/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        isActive,
        permissionIds: selectedPermissionIds,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to update role.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PencilLine className="h-3.5 w-3.5" />
        Edit
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card shadow-2xl">
            {/* Dialog header */}
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-semibold">Edit Role</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Update details and assigned permissions.
                </p>
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

            {/* Form body */}
            <div className="p-6 space-y-5">
              {/* Name + Active toggle */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Role Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. HR Manager"
                    className={inputClass}
                  />
                </div>

                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span>Active role</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional descriptionâ€¦"
                  className={inputClass}
                />
              </div>

              {/* Permissions section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Permissions</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedPermissionIds.length} selected
                    </p>
                  </div>
                </div>

                {/* Permission search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder="Search systems or permissionsâ€¦"
                    className={`${inputClass} pl-9`}
                  />
                </div>

                {/* Permission list */}
                <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(groupedPermissions).map(
                    ([systemName, systemPermissions]) => (
                      <div key={systemName}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {systemName}
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {systemPermissions.map((p) => (
                            <label
                              key={p.id}
                              className="flex items-start gap-2 rounded-lg border bg-background p-2 text-sm hover:bg-muted/40 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissionIds.includes(p.id)}
                                onChange={() => togglePermission(p.id)}
                                className="mt-0.5 h-3.5 w-3.5 rounded accent-primary"
                              />
                              <span className="leading-snug">
                                {p.displayName}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ),
                  )}

                  {Object.keys(groupedPermissions).length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No permissions match your search.
                    </p>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Savingâ€¦" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
