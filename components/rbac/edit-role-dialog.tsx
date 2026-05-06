"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
        (permission) =>
          permission.displayName.toLowerCase().includes(search) ||
          permission.systemName.toLowerCase().includes(search),
      )
      .reduce<Record<string, Permission[]>>((groups, permission) => {
        if (!groups[permission.systemName]) {
          groups[permission.systemName] = [];
        }

        groups[permission.systemName].push(permission);
        return groups;
      }, {});
  }, [permissions, permissionSearch]);

  function togglePermission(permissionId: number) {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
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
      headers: {
        "Content-Type": "application/json",
      },
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <div>
              <h2 className="text-lg font-semibold">Edit Role</h2>
              <p className="text-sm text-muted-foreground">
                Update role details and assigned access.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Active role
              </label>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <h3 className="font-medium">Assigned Access</h3>
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedPermissionIds.length}
                </p>
              </div>

              <input
                value={permissionSearch}
                onChange={(event) => setPermissionSearch(event.target.value)}
                placeholder="Search systems or permissions..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="max-h-80 space-y-4 overflow-y-auto rounded-md border p-4">
                {Object.entries(groupedPermissions).map(
                  ([systemName, systemPermissions]) => (
                    <div key={systemName} className="space-y-2">
                      <h4 className="text-sm font-semibold">{systemName}</h4>

                      <div className="grid gap-2 md:grid-cols-2">
                        {systemPermissions.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissionIds.includes(
                                permission.id,
                              )}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-1"
                            />

                            <span>{permission.displayName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ),
                )}

                {Object.keys(groupedPermissions).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No permissions found.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
