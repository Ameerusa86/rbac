import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/roles", label: "Roles" },
  { href: "/role-matrix", label: "Matrix" },
  { href: "/systems", label: "Systems" },
  { href: "/permissions", label: "Permissions" },
];

export function RbacNav() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/" className="font-semibold">
          RBAC Manager
        </Link>

        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
