"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">RBAC Manager</p>
          <p className="text-[11px] text-muted-foreground">Access Control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Navigation
        </p>

        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-[11px] text-muted-foreground/50">
          Role-Based Access Control
        </p>
      </div>
    </aside>
  );
}
