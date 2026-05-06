"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Grid2x2,
  KeyRound,
  LayoutDashboard,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/roles", label: "Roles", icon: Users, exact: false },
  { href: "/role-matrix", label: "Role Matrix", icon: Grid2x2, exact: false },
  { href: "/systems", label: "Systems", icon: Server, exact: false },
  { href: "/permissions", label: "Permissions", icon: KeyRound, exact: false },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("rbac-sidebar-collapsed");
    if (stored === "1") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("rbac-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col border-r bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        className={cn(
          "absolute top-5 z-20 rounded-full border bg-card p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground",
          collapsed ? "-right-4" : "right-3",
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronsRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronsLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center border-b",
          collapsed ? "justify-center px-2" : "justify-between gap-3 px-5",
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <ShieldCheck className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">
              RBAC Manager
            </p>
            <p className="text-[11px] text-muted-foreground">Access Control</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {!collapsed && (
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Navigation
          </p>
        )}

        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center" : "gap-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground/70",
                    )}
                  />
                  {!collapsed && item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t p-4">
          <p className="text-[11px] text-muted-foreground/50">
            Role-Based Access Control
          </p>
        </div>
      )}
    </aside>
  );
}
