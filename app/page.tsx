import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Database,
  KeyRound,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const destinations = [
  {
    title: "Roles Explorer",
    description:
      "Read-only review surface for managers, analysts, and operations leads.",
    href: "/roles",
    icon: BriefcaseBusiness,
    accent: "border-emerald-200 bg-emerald-50/85 text-emerald-900",
  },
  {
    title: "Admin Workspace",
    description:
      "Controlled CRUD workbench for role governance and access maintenance.",
    href: "/admin",
    icon: ShieldCheck,
    accent: "border-slate-200 bg-slate-50/85 text-slate-950",
  },
  {
    title: "Roles API",
    description:
      "Operational JSON surface for integrations, testing, and diagnostics.",
    href: "/api/roles",
    icon: Database,
    accent: "border-amber-200 bg-amber-50/85 text-amber-900",
  },
];

const UNASSIGNED_MANAGER = "Unassigned";

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

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

async function getHomeReport() {
  const roles = await db.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      updatedAt: true,
      rolePermissions: {
        select: {
          permission: {
            select: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const managerCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  let activeRoles = 0;
  let rolesWithRbgGroup = 0;
  let rolesWithDocuWareAdGroup = 0;
  let rolesWithAssignedManager = 0;

  for (const role of roles) {
    if (role.isActive) {
      activeRoles += 1;
    }

    const managerName = extractManagerName(role.description);
    if (managerName !== UNASSIGNED_MANAGER) {
      rolesWithAssignedManager += 1;
    }

    managerCounts.set(managerName, (managerCounts.get(managerName) ?? 0) + 1);

    const categories = new Set(
      role.rolePermissions
        .map((entry) => entry.permission.category)
        .filter((category): category is string => Boolean(category)),
    );

    if (categories.has("RBG Group")) {
      rolesWithRbgGroup += 1;
    }

    if (categories.has("DocuWare AD Group")) {
      rolesWithDocuWareAdGroup += 1;
    }

    for (const category of categories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  const topManagers = [...managerCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      if (a[0] === "RBG Group") {
        return -1;
      }

      if (b[0] === "RBG Group") {
        return 1;
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const recentRoles = roles.slice(0, 6).map((role) => ({
    id: role.id,
    name: role.name,
    manager: extractManagerName(role.description),
    isActive: role.isActive,
    updatedAt: role.updatedAt,
  }));

  return {
    totalRoles: roles.length,
    activeRoles,
    inactiveRoles: roles.length - activeRoles,
    rolesWithAssignedManager,
    rolesWithRbgGroup,
    rolesWithDocuWareAdGroup,
    topManagers,
    topCategories,
    recentRoles,
    accessCategoryCount: categoryCounts.size,
  };
}

function ReportStat({
  label,
  value,
  description,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <article className="rounded-[28px] border border-white/70 bg-white/84 p-5 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <div className={`inline-flex rounded-2xl border px-3 py-3 ${accent}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </article>
  );
}

export default async function Home() {
  const report = await getHomeReport();
  const maxManagerCount = report.topManagers[0]?.count ?? 1;
  const maxCategoryCount = report.topCategories[0]?.count ?? 1;

  return (
    <div className="flex min-h-dvh w-full flex-col bg-transparent">
      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/78 p-6 shadow-[0_40px_110px_-56px_rgba(15,23,42,0.42)] backdrop-blur-xl md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_24%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  RBAC Console
                </span>
                <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Live SQL reporting
                </span>
              </div>

              <h1 className="mt-5 max-w-4xl font-heading text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
                Professional role and access operations for the imported RBAC
                matrix.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                Review workbook-derived permissions, spotlight RBG and
                AD-oriented access, and monitor governance coverage from a
                landing page that reflects the current RBAC data.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild className="min-w-[12rem]">
                  <Link href="/roles">
                    <BriefcaseBusiness className="size-4" />
                    Open Explorer
                  </Link>
                </Button>
                <Button asChild variant="outline" className="min-w-[12rem]">
                  <Link href="/admin">
                    <ShieldCheck className="size-4" />
                    Open Admin
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {destinations.map((destination) => {
                const Icon = destination.icon;

                return (
                  <Link
                    key={destination.href}
                    href={destination.href}
                    className="group rounded-[28px] border border-slate-200/80 bg-white/90 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_50px_-32px_rgba(15,23,42,0.32)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div
                          className={`inline-flex rounded-2xl border px-3 py-2 ${destination.accent}`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                          {destination.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {destination.description}
                        </p>
                      </div>

                      <ArrowRight className="size-5 text-slate-400 transition group-hover:text-slate-900" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReportStat
            label="Imported Roles"
            value={formatCount(report.totalRoles)}
            description="Roles currently loaded from the RBAC workbook into SQL Server."
            accent="border-slate-200 bg-slate-50 text-slate-900"
            icon={BriefcaseBusiness}
          />
          <ReportStat
            label="Active Roles"
            value={formatCount(report.activeRoles)}
            description={`${formatCount(report.inactiveRoles)} roles are currently marked inactive.`}
            accent="border-emerald-200 bg-emerald-50 text-emerald-900"
            icon={Activity}
          />
          <ReportStat
            label="RBG Coverage"
            value={formatCount(report.rolesWithRbgGroup)}
            description="Roles currently carrying the imported RBG Group access category."
            accent="border-amber-200 bg-amber-50 text-amber-900"
            icon={KeyRound}
          />
          <ReportStat
            label="Access Categories"
            value={formatCount(report.accessCategoryCount)}
            description="Unique access group categories currently represented in the role catalog."
            accent="border-sky-200 bg-sky-50 text-sky-900"
            icon={Layers3}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
          <article className="rounded-[32px] border border-white/70 bg-white/84 p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Manager Ownership
                </p>
                <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-slate-950">
                  Top managers by role count
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Roles with an identified owner from the imported workbook
                  description metadata.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Assigned owners
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {formatCount(report.rolesWithAssignedManager)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {report.topManagers.map((manager) => (
                <div key={manager.name}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <p className="font-medium text-slate-900">{manager.name}</p>
                    <p className="text-slate-500">
                      {formatCount(manager.count)} roles
                    </p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_100%)]"
                      style={{
                        width: `${Math.max(
                          16,
                          Math.round((manager.count / maxManagerCount) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[32px] border border-white/70 bg-white/84 p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Access Coverage
                </p>
                <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-slate-950">
                  Highest-coverage access groups
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Categories ranked by the number of roles carrying at least one
                  permission in that group.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right text-emerald-900">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  DocuWare AD
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {formatCount(report.rolesWithDocuWareAdGroup)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {report.topCategories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <p className="font-medium text-slate-900">
                      {category.name}
                    </p>
                    <p className="text-slate-500">
                      {formatCount(category.count)} roles
                    </p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${
                        category.name === "RBG Group"
                          ? "bg-[linear-gradient(90deg,#065f46_0%,#10b981_100%)]"
                          : "bg-[linear-gradient(90deg,#0f172a_0%,#475569_100%)]"
                      }`}
                      style={{
                        width: `${Math.max(
                          16,
                          Math.round((category.count / maxCategoryCount) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[32px] border border-white/70 bg-white/84 p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Recent Role Updates
                </p>
                <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-slate-950">
                  Latest catalog activity
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Most recently changed roles in the current SQL snapshot.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
                <Building2 className="size-5" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {report.recentRoles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{role.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Manager: {role.manager}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
                        role.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {role.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(role.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
