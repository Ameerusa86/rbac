"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Filter,
  Home,
  KeyRound,
  Layers3,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import type { ComponentType, FormEvent, RefObject } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

export type ConsoleMode = "explorer" | "admin";

type RoleRecord = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: string[];
};

type RoleFormState = {
  name: string;
  description: string;
  isActive: boolean;
  permissionsText: string;
};

type AccessGroup = {
  category: string;
  items: string[];
};

const initialForm: RoleFormState = {
  name: "",
  description: "",
  isActive: true,
  permissionsText: "",
};

const UNASSIGNED_MANAGER = "Unassigned";
const PRIORITIZED_CATEGORIES = ["RBG Group"];

const CONSOLE_COPY = {
  explorer: {
    eyebrow: "Access Explorer",
    title: "Enterprise Role Directory",
    description:
      "Review imported role access posture with grouped permissions, manager ownership, and workbook-aligned categories.",
    listTitle: "Role Directory",
    listDescription:
      "Search job titles, managers, and access entries without entering edit mode.",
    overviewTitle: "Access Intelligence",
    overviewDescription:
      "Read-only role context with the highest-priority access groups surfaced first.",
    highlight: "Read-only workspace",
  },
  admin: {
    eyebrow: "Admin Workbench",
    title: "Role And Access Administration",
    description:
      "Operate the controlled CRUD workspace for role changes, access maintenance, and governance review.",
    listTitle: "Change Queue",
    listDescription:
      "Filter the imported catalog, choose a role, then update its metadata and assigned accesses.",
    overviewTitle: "Change Review",
    overviewDescription:
      "Inspect grouped access, highlight Active Directory groups, then apply controlled edits from the same workspace.",
    highlight: "Restricted workspace",
  },
} as const;

const fieldClassName =
  "h-11 w-full rounded-2xl border border-slate-200/90 bg-white px-4 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5";

function parsePermissions(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractManagerName(description: string | null) {
  if (!description) {
    return UNASSIGNED_MANAGER;
  }

  const match = description.match(/default manager\s*:\s*([^|]+)/i);
  if (!match?.[1]) {
    return UNASSIGNED_MANAGER;
  }

  const manager = match[1].trim();
  return manager || UNASSIGNED_MANAGER;
}

function getPermissionCategory(permission: string) {
  const separatorIndex = permission.indexOf(":");

  if (separatorIndex === -1) {
    return "General Access";
  }

  return permission.slice(0, separatorIndex).trim() || "General Access";
}

function getPermissionItem(permission: string) {
  const separatorIndex = permission.indexOf(":");

  if (separatorIndex === -1) {
    return permission;
  }

  return permission.slice(separatorIndex + 1).trim() || "Access enabled";
}

function buildAccessGroups(permissions: string[]): AccessGroup[] {
  const byCategory = new Map<string, Set<string>>();

  for (const permission of permissions) {
    const value = permission.trim();
    if (!value) {
      continue;
    }

    const category = getPermissionCategory(value);
    const item = getPermissionItem(value);
    const current = byCategory.get(category) ?? new Set<string>();
    current.add(item);
    byCategory.set(category, current);
  }

  return [...byCategory.entries()]
    .map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const aPriority = PRIORITIZED_CATEGORIES.indexOf(a.category);
      const bPriority = PRIORITIZED_CATEGORIES.indexOf(b.category);

      if (aPriority !== -1 || bPriority !== -1) {
        if (aPriority === -1) {
          return 1;
        }

        if (bPriority === -1) {
          return -1;
        }

        return aPriority - bPriority;
      }

      return a.category.localeCompare(b.category);
    });
}

function getDefaultExpandedGroups(accessGroups: AccessGroup[]) {
  if (accessGroups.length === 0) {
    return [];
  }

  const defaultCategories = accessGroups
    .filter((group, index) => group.category === "RBG Group" || index === 0)
    .map((group) => group.category);

  return [...new Set(defaultCategories)];
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return { error: text || `Request failed with status ${response.status}` };
}

function focusOverviewPanel(ref: RefObject<HTMLElement | null>) {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.matchMedia("(max-width: 1279px)").matches) {
    return;
  }

  requestAnimationFrame(() => {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function MetricCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "slate" | "emerald" | "amber" | "ice";
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <article
      className={cn(
        "rounded-[28px] border p-5 shadow-[0_28px_70px_-36px_rgba(15,23,42,0.45)]",
        tone === "slate" &&
          "border-slate-900/80 bg-[linear-gradient(145deg,#0f172a_0%,#1e293b_55%,#334155_100%)] text-white",
        tone === "emerald" &&
          "border-emerald-600/60 bg-[linear-gradient(145deg,#065f46_0%,#0f766e_58%,#14b8a6_100%)] text-white",
        tone === "amber" &&
          "border-amber-300/70 bg-[linear-gradient(145deg,#f6bd60_0%,#f59e0b_55%,#fb7185_100%)] text-slate-950",
        tone === "ice" &&
          "border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.92)_0%,rgba(241,245,249,0.95)_100%)] text-slate-950",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-sm opacity-75">{hint}</p>
        </div>

        <div className="rounded-2xl border border-current/15 bg-white/10 p-3">
          <Icon className="size-5" />
        </div>
      </div>
    </article>
  );
}

export function RbacConsole({ mode }: { mode: ConsoleMode }) {
  const copy = CONSOLE_COPY[mode];
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [form, setForm] = useState<RoleFormState>(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<RoleRecord | null>(
    null,
  );
  const overviewRef = useRef<HTMLElement | null>(null);

  const managerOptions = useMemo(() => {
    const uniqueManagers = new Set(
      roles.map((role) => extractManagerName(role.description)),
    );

    return [...uniqueManagers].sort((a, b) => a.localeCompare(b));
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return roles.filter((role) => {
      const manager = extractManagerName(role.description);

      if (statusFilter === "active" && !role.isActive) {
        return false;
      }

      if (statusFilter === "inactive" && role.isActive) {
        return false;
      }

      if (managerFilter !== "all" && manager !== managerFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchText = [
        role.name,
        role.description ?? "",
        manager,
        ...role.permissions,
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedSearch);
    });
  }, [roles, deferredSearchTerm, statusFilter, managerFilter]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const selectedManager = selectedRole
    ? extractManagerName(selectedRole.description)
    : UNASSIGNED_MANAGER;

  const selectedAccessGroups = useMemo(
    () => (selectedRole ? buildAccessGroups(selectedRole.permissions) : []),
    [selectedRole],
  );

  const selectedRbgGroup = useMemo(
    () => selectedAccessGroups.find((group) => group.category === "RBG Group"),
    [selectedAccessGroups],
  );
  const expandedGroupSet = useMemo(
    () => new Set(expandedGroups),
    [expandedGroups],
  );

  const managerCount = managerOptions.length;
  const activeRoleCount = useMemo(
    () => roles.filter((role) => role.isActive).length,
    [roles],
  );
  const accessCategoryCount = useMemo(() => {
    const categories = new Set<string>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        categories.add(getPermissionCategory(permission));
      }
    }

    return categories.size;
  }, [roles]);
  const accessAssignmentCount = useMemo(
    () => roles.reduce((total, role) => total + role.permissions.length, 0),
    [roles],
  );

  async function loadRoles() {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/roles", { cache: "no-store" });
      const payload = await readResponsePayload(response);

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load roles");
      }

      setRoles(payload.data || []);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load roles";

      setLoadError(errorMessage);
      toast.error("Unable to load roles", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoles();
  }, []);

  useEffect(() => {
    if (mode === "explorer") {
      if (filteredRoles.length === 0) {
        setSelectedRoleId(null);
        return;
      }

      if (
        !selectedRoleId ||
        !filteredRoles.some((role) => role.id === selectedRoleId)
      ) {
        setSelectedRoleId(filteredRoles[0].id);
      }

      return;
    }

    if (selectedRoleId && !roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(null);
    }
  }, [filteredRoles, mode, roles, selectedRoleId]);

  useEffect(() => {
    if (mode !== "admin") {
      return;
    }

    if (!selectedRole) {
      setForm(initialForm);
      return;
    }

    setForm({
      name: selectedRole.name,
      description: selectedRole.description || "",
      isActive: selectedRole.isActive,
      permissionsText: selectedRole.permissions.join(", "),
    });
  }, [mode, selectedRole]);

  useEffect(() => {
    setExpandedGroups(getDefaultExpandedGroups(selectedAccessGroups));
  }, [selectedAccessGroups]);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setManagerFilter("all");
  }

  function onCreateNew() {
    setSelectedRoleId(null);
    setForm(initialForm);
    focusOverviewPanel(overviewRef);
  }

  function onSelectRole(roleId: number) {
    setSelectedRoleId(roleId);
    focusOverviewPanel(overviewRef);
  }

  function onRequestDelete(role: RoleRecord) {
    setDeleteCandidate(role);
  }

  function toggleAccessGroup(category: string) {
    setExpandedGroups((previous) =>
      previous.includes(category)
        ? previous.filter((value) => value !== category)
        : [...previous, category],
    );
  }

  function expandAllGroups() {
    setExpandedGroups(selectedAccessGroups.map((group) => group.category));
  }

  function collapseAllGroups() {
    setExpandedGroups([]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode !== "admin") {
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      permissions: parsePermissions(form.permissionsText),
    };

    const url = selectedRoleId ? `/api/roles/${selectedRoleId}` : "/api/roles";
    const method = selectedRoleId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await readResponsePayload(response);

      if (!response.ok) {
        throw new Error(body.error || "Save failed");
      }

      const successTitle = selectedRoleId ? "Role updated" : "Role created";
      const roleName = body.data?.name || payload.name.trim() || "Role";

      toast.success(successTitle, {
        description: roleName,
      });
      await loadRoles();

      if (!selectedRoleId && body.data?.id) {
        onSelectRole(body.data.id);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Save failed";

      toast.error("Unable to save role", {
        description: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteConfirmed() {
    if (!deleteCandidate) {
      return;
    }

    const roleId = deleteCandidate.id;
    const roleName = deleteCandidate.name;

    setDeleting(true);

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
      });

      const body = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(body.error || "Delete failed");
      }

      if (selectedRoleId === roleId) {
        setSelectedRoleId(null);
      }

      setDeleteCandidate(null);
      toast.success("Role deleted", {
        description: roleName,
      });
      await loadRoles();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Delete failed";

      toast.error("Unable to delete role", {
        description: errorMessage,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <AlertDialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteCandidate(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? `This will permanently remove ${deleteCandidate.name} and its linked access assignments from the RBAC catalog.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void onDeleteConfirmed();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex min-h-dvh w-full flex-col bg-transparent">
        <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <section className="relative overflow-hidden rounded-[32px] border border-white/65 bg-white/78 p-6 shadow-[0_36px_110px_-52px_rgba(15,23,42,0.42)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_28%)]" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    {copy.highlight}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {copy.eyebrow}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Excel-aligned import
                  </span>
                </div>

                <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  {copy.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                  {copy.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                <Button asChild variant="outline" className="min-w-[8rem]">
                  <Link href="/">
                    <Home className="size-4" />
                    Home
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={mode === "explorer" ? "default" : "outline"}
                  className="min-w-[10rem]"
                >
                  <Link href="/roles">
                    <BriefcaseBusiness className="size-4" />
                    Explorer
                  </Link>
                </Button>
                <Button
                  asChild
                  variant={mode === "admin" ? "default" : "outline"}
                  className="min-w-[10rem]"
                >
                  <Link href="/admin">
                    <ShieldCheck className="size-4" />
                    Admin
                  </Link>
                </Button>
                <Button asChild variant="outline" className="min-w-[10rem]">
                  <Link href="/api/roles">
                    <ArrowRight className="size-4" />
                    Roles API
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Imported Roles"
              value={formatCount(roles.length)}
              hint="Workbook roles synced into the live catalog."
              tone="slate"
              icon={BriefcaseBusiness}
            />
            <MetricCard
              label="Active Roles"
              value={formatCount(activeRoleCount)}
              hint="Currently marked active in the operational directory."
              tone="emerald"
              icon={Activity}
            />
            <MetricCard
              label="Managers"
              value={formatCount(managerCount)}
              hint="Distinct owners extracted from the imported workbook."
              tone="ice"
              icon={UserRoundCog}
            />
            <MetricCard
              label={mode === "admin" ? "Access Categories" : "Access Links"}
              value={formatCount(
                mode === "admin" ? accessCategoryCount : accessAssignmentCount,
              )}
              hint={
                mode === "admin"
                  ? "Categories available for governance review and editing."
                  : "Permission assignments across all imported job roles."
              }
              tone="amber"
              icon={mode === "admin" ? Layers3 : KeyRound}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(430px,0.95fr)] xl:items-start">
            <section className="flex min-h-[640px] flex-col overflow-hidden rounded-[32px] border border-white/65 bg-white/82 p-5 shadow-[0_32px_90px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl xl:max-h-[calc(100dvh-17rem)]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {copy.eyebrow}
                  </p>
                  <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-slate-950">
                    {copy.listTitle}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {copy.listDescription}
                  </p>
                </div>

                {mode === "admin" ? (
                  <Button className="min-w-[10rem]" onClick={onCreateNew}>
                    <Plus className="size-4" />
                    New Role
                  </Button>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_160px_190px_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={cn(fieldClassName, "pl-11")}
                    placeholder="Search job, manager, or access..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>

                <select
                  className={fieldClassName}
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "all" | "active" | "inactive",
                    )
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  className={fieldClassName}
                  value={managerFilter}
                  onChange={(event) => setManagerFilter(event.target.value)}
                >
                  <option value="all">All managers</option>
                  {managerOptions.map((managerName) => (
                    <option key={managerName} value={managerName}>
                      {managerName}
                    </option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  className="h-11"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                <p>{formatCount(filteredRoles.length)} roles visible</p>
                <p>
                  {formatCount(accessCategoryCount)} access categories indexed
                </p>
              </div>

              {loadError ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  <div>
                    <p className="font-semibold text-red-800">
                      Directory refresh failed.
                    </p>
                    <p className="mt-1 text-red-700">{loadError}</p>
                  </div>
                  <Button variant="outline" onClick={() => void loadRoles()}>
                    Retry
                  </Button>
                </div>
              ) : null}

              {loading ? (
                <div className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500">
                  Loading role directory...
                </div>
              ) : loadError && filteredRoles.length === 0 ? (
                <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-red-200 bg-red-50/70 px-6 text-center">
                  <Filter className="size-8 text-red-300" />
                  <p className="mt-4 text-base font-semibold text-red-900">
                    Unable to load the role directory.
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-red-700">
                    Retry the request to refresh the imported RBAC catalog from
                    SQL Server.
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => void loadRoles()}
                  >
                    Retry Load
                  </Button>
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
                  <Filter className="size-8 text-slate-300" />
                  <p className="mt-4 text-base font-semibold text-slate-900">
                    No roles matched the current filters.
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Clear the search and manager filters to bring roles back
                    into the directory.
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                  {filteredRoles.map((role) => {
                    const managerName = extractManagerName(role.description);
                    const previewGroups = buildAccessGroups(
                      role.permissions,
                    ).slice(0, 3);

                    return (
                      <article
                        key={role.id}
                        className={cn(
                          "group cursor-pointer rounded-[28px] border p-5 transition duration-200",
                          selectedRoleId === role.id
                            ? "border-emerald-300 bg-[linear-gradient(160deg,rgba(236,253,245,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_18px_45px_-28px_rgba(5,150,105,0.42)]"
                            : "border-slate-200/80 bg-white/92 hover:border-slate-300 hover:shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)]",
                        )}
                        onClick={() => onSelectRole(role.id)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                              Job Role
                            </p>
                            <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                              {role.name}
                            </h3>
                            <p className="mt-2 text-sm text-slate-600">
                              <span className="font-medium text-slate-800">
                                Manager:
                              </span>{" "}
                              {managerName}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em]",
                                role.isActive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-700",
                              )}
                            >
                              {role.isActive ? "Active" : "Inactive"}
                            </span>

                            {mode === "admin" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onSelectRole(role.id);
                                }}
                              >
                                <PencilLine className="size-4" />
                                Manage
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {formatCount(role.permissions.length)} accesses
                          </span>
                          {previewGroups.map((group) => (
                            <span
                              key={`${role.id}-${group.category}`}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium",
                                group.category === "RBG Group"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-white text-slate-700",
                              )}
                            >
                              {group.category}
                            </span>
                          ))}
                        </div>

                        {mode === "admin" ? (
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectRole(role.id);
                              }}
                            >
                              <PencilLine className="size-4" />
                              Edit Role
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                onRequestDelete(role);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside ref={overviewRef} className="xl:sticky xl:top-6">
              <div className="flex flex-col gap-4 xl:max-h-[calc(100dvh-3rem)]">
                <section className="overflow-hidden rounded-[32px] border border-white/65 bg-white/84 p-5 shadow-[0_32px_90px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {copy.eyebrow}
                      </p>
                      <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-slate-950">
                        {copy.overviewTitle}
                      </h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        {copy.overviewDescription}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="font-medium text-slate-950">
                        {selectedRole ? selectedAccessGroups.length : 0} grouped
                        sections
                      </p>
                      <p className="mt-1">RBG Group is pinned to the top.</p>
                    </div>
                  </div>

                  {selectedRole ? (
                    <div className="mt-5 space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Job Name
                          </p>
                          <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                            {selectedRole.name}
                          </p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Manager
                          </p>
                          <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                            {selectedManager}
                          </p>
                        </div>
                      </div>

                      {selectedRbgGroup ? (
                        <div className="rounded-3xl border border-emerald-200 bg-[linear-gradient(145deg,rgba(236,253,245,0.98)_0%,rgba(209,250,229,0.9)_100%)] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
                                Active Directory Group
                              </p>
                              <p className="mt-2 text-sm leading-6 text-emerald-900">
                                RBG Group is treated as the primary AD-style
                                grouping and surfaced first.
                              </p>
                            </div>
                            <Building2 className="size-5 text-emerald-800" />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedRbgGroup.items.map((item) => (
                              <span
                                key={`rbg-${item}`}
                                className="rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-900"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/80">
                        <div className="border-b border-slate-200 px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                Grouped Accesses
                              </p>
                              <p className="text-xs text-slate-500">
                                Imported workbook categories with badge-level
                                detail.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {formatCount(selectedRole.permissions.length)}{" "}
                                assignments
                              </div>
                              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {formatCount(expandedGroups.length)} open
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={expandAllGroups}
                                disabled={
                                  selectedAccessGroups.length === 0 ||
                                  expandedGroups.length ===
                                    selectedAccessGroups.length
                                }
                              >
                                Expand All
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={collapseAllGroups}
                                disabled={expandedGroups.length === 0}
                              >
                                Collapse All
                              </Button>
                            </div>
                          </div>

                          <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                            {formatCount(selectedAccessGroups.length)}{" "}
                            categories in view
                          </p>
                        </div>

                        <div className="max-h-[28rem] space-y-3 overflow-y-auto p-3 pr-2 xl:max-h-[40rem]">
                          {selectedAccessGroups.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                              No access entries assigned.
                            </p>
                          ) : (
                            selectedAccessGroups.map((group) => {
                              const isExpanded = expandedGroupSet.has(
                                group.category,
                              );

                              return (
                                <section
                                  key={group.category}
                                  className={cn(
                                    "overflow-hidden rounded-[24px] border transition duration-200",
                                    isExpanded
                                      ? "border-slate-300 bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.3)]"
                                      : "border-slate-200 bg-white/92 hover:border-slate-300",
                                  )}
                                >
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                                    onClick={() =>
                                      toggleAccessGroup(group.category)
                                    }
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        {group.category === "RBG Group" ? (
                                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                                            Priority
                                          </span>
                                        ) : null}
                                        <p className="text-sm font-semibold text-slate-950">
                                          {group.category}
                                        </p>
                                      </div>
                                      <p className="mt-2 text-xs leading-5 text-slate-500">
                                        {isExpanded
                                          ? `${formatCount(group.items.length)} access entries listed in this category.`
                                          : `Select to review ${formatCount(group.items.length)} access entries.`}
                                      </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3">
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                        {formatCount(group.items.length)} items
                                      </span>
                                      <span
                                        className={cn(
                                          "flex size-9 items-center justify-center rounded-full border transition",
                                          isExpanded
                                            ? "border-slate-300 bg-slate-100 text-slate-700"
                                            : "border-slate-200 bg-white text-slate-400",
                                        )}
                                      >
                                        <ChevronDown
                                          className={cn(
                                            "size-4 transition-transform duration-200",
                                            isExpanded
                                              ? "rotate-180"
                                              : "rotate-0",
                                          )}
                                        />
                                      </span>
                                    </div>
                                  </button>

                                  {isExpanded ? (
                                    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4">
                                      <div className="flex flex-wrap gap-2">
                                        {group.items.map((item) => (
                                          <span
                                            key={`${group.category}-${item}`}
                                            className={cn(
                                              "rounded-full border px-3 py-1 text-xs font-medium",
                                              group.category === "RBG Group"
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                : "border-slate-200 bg-white text-slate-700",
                                            )}
                                          >
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </section>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
                      <Sparkles className="mx-auto size-8 text-slate-300" />
                      <p className="mt-4 text-base font-semibold text-slate-950">
                        {mode === "admin"
                          ? "Select a role or start a new one."
                          : "Select a role to inspect its access posture."}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {mode === "admin"
                          ? "The admin form and grouped access review will appear here once a role is selected."
                          : "The right pane keeps grouped workbook categories and Active Directory groups in one place."}
                      </p>
                    </div>
                  )}
                </section>

                {mode === "admin" ? (
                  <section className="overflow-hidden rounded-[32px] border border-white/65 bg-white/84 p-5 shadow-[0_32px_90px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Controlled Edit Surface
                        </p>
                        <h3 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-slate-950">
                          {selectedRoleId ? "Update Role" : "Create Role"}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Modify role metadata and access assignments from the
                          same governance workspace.
                        </p>
                      </div>

                      <Button variant="outline" onClick={onCreateNew}>
                        <Plus className="size-4" />
                        New Draft
                      </Button>
                    </div>

                    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-2 block font-medium text-slate-700">
                            Role name
                          </span>
                          <input
                            required
                            className={fieldClassName}
                            value={form.name}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                name: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                isActive: event.target.checked,
                              }))
                            }
                          />
                          Mark role as active
                        </label>
                      </div>

                      <label className="block text-sm">
                        <span className="mb-2 block font-medium text-slate-700">
                          Description / source notes
                        </span>
                        <textarea
                          className="min-h-28 w-full rounded-3xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                          value={form.description}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="block text-sm">
                        <span className="mb-2 block font-medium text-slate-700">
                          Access assignments
                        </span>
                        <textarea
                          className="min-h-36 w-full rounded-3xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                          placeholder="Comma-separated permissions or workbook-derived access labels"
                          value={form.permissionsText}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              permissionsText: event.target.value,
                            }))
                          }
                        />
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Entries remain comma-separated. Imported workbook
                          categories, including RBG Group, will render as
                          grouped badges.
                        </p>
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="submit"
                          disabled={saving}
                          className="min-w-[11rem]"
                        >
                          {saving ? (
                            "Saving..."
                          ) : selectedRoleId ? (
                            <>
                              <PencilLine className="size-4" />
                              Save Changes
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" />
                              Create Role
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onCreateNew}
                        >
                          Reset Form
                        </Button>
                      </div>
                    </form>
                  </section>
                ) : null}
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
