"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";

type CreatePermissionDialogProps = {
  systemId: number;
  systemName: string;
  onPermissionCreated?: () => void;
};

export function CreatePermissionDialog({
  systemId,
  systemName,
  onPermissionCreated,
}: CreatePermissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate() {
    if (!displayName.trim()) {
      toast.error("Permission name is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId,
          displayName: displayName.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error || `Failed to create permission (${response.status})`,
        );
      }

      const { data } = await response.json();
      toast.success(`Permission "${data.displayName}" created for ${systemName}`);

      setDisplayName("");
      setDescription("");
      setOpen(false);

      if (onPermissionCreated) {
        onPermissionCreated();
      } else {
        window.location.reload();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-3.5 w-3.5" />
        Add Permission
      </Button>

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Add Permission to {systemName}</AlertDialogTitle>
          <AlertDialogDescription>
            Create a new permission that can be assigned to roles.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="displayName" className="text-sm font-medium">
              Permission Name
            </label>
            <input
              id="displayName"
              type="text"
              placeholder="e.g., View Reports"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="description"
              placeholder="What does this permission allow?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
