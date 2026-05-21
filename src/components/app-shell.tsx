"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  BarChart3,
  Users,
  Settings,
  Menu,
} from "lucide-react";
import type { Role } from "@/lib/auth";
import type { OrgBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface ShellUser {
  name?: string;
  email: string;
  role: Role;
  orgSlug: string;
}

/** Navigation, filtered by role. New sections register here. */
const NAV_ITEMS: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "learner"],
  },
  {
    href: "/courses",
    label: "Courses",
    icon: BookOpen,
    roles: ["admin", "manager", "learner"],
  },
  {
    href: "/certifications",
    label: "Certifications",
    icon: Award,
    roles: ["admin", "manager", "learner"],
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
  { href: "/people", label: "People", icon: Users, roles: ["admin", "manager"] },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function AppShell({
  user,
  branding,
  brandName,
  children,
}: {
  user: ShellUser;
  branding: OrgBranding;
  brandName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Close the mobile drawer on navigation.
  React.useEffect(() => setOpen(false), [pathname]);

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center px-5">
          <Logo branding={branding} alt={brandName} className="h-7 w-auto" />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-sidebar-border border-t p-3">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium">
              {user.name ?? user.email}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              <span className="capitalize">{user.role}</span> · {user.orgSlug}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ThemeToggle />
            <form action="/api/auth/logout" method="post" className="flex-1">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <Button
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <Logo branding={branding} alt={brandName} className="h-6 w-auto" />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
