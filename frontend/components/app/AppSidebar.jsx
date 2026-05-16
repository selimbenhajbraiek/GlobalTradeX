"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Search,
  Settings,
  Shield,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/context/AuthContext";
import { notificationsApi } from "@/lib/api";
import { navForRole, ROLE_LABELS } from "@/lib/dashboard-nav";

const ICONS = {
  LayoutDashboard,
  Package,
  BarChart3,
  FileText,
  Truck,
  Users,
  Shield,
  Sparkles,
  MessageSquare,
  Bell,
  Settings,
};

function NavGroup({ title, items, pathname, unreadCount }) {
  return (
    <div className="mt-6">
      <p className="px-3 eyebrow !text-[10px]">{title}</p>
      <ul className="mt-2 space-y-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.iconKey] || Package;
          const active = item.exact
            ? pathname === item.href || pathname === `${item.href}/`
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge =
            item.badge && unreadCount > 0 ? unreadCount : item.badge && item.badge !== true ? item.badge : null;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-foreground font-medium text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {active ? (
                  <span
                    className="absolute bottom-1 top-1 start-0 w-0.5 rounded-full bg-kinetic"
                    aria-hidden
                  />
                ) : null}
                <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
                <span className="flex-1">{item.label}</span>
                {badge ? (
                  <span className="rounded-full bg-kinetic px-1.5 py-0.5 font-mono text-[10px] text-kinetic-foreground">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "importateur";
  const nav = navForRole(role);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list({ limit: 50, unread_only: true });
      setUnreadCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const id = setInterval(loadUnread, 30_000);
    return () => clearInterval(id);
  }, [loadUnread]);

  const initials = (user?.full_name || "GT")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-e border-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Logo href={nav.home} size="sm" />
      </div>

      <div className="px-3 py-4">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search"
            className="w-full rounded-md border border-border bg-background py-2 pe-12 ps-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Dashboard">
        {nav.workspace.length ? (
          <NavGroup title="Workspace" items={nav.workspace} pathname={pathname} unreadCount={unreadCount} />
        ) : null}
        {nav.roles.length ? (
          <NavGroup title="Roles" items={nav.roles} pathname={pathname} unreadCount={unreadCount} />
        ) : null}
        {nav.intelligence.length ? (
          <NavGroup title="Intelligence" items={nav.intelligence} pathname={pathname} unreadCount={unreadCount} />
        ) : null}
        {nav.account.length ? (
          <NavGroup title="Account" items={nav.account} pathname={pathname} unreadCount={unreadCount} />
        ) : null}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kinetic font-mono text-xs font-medium text-kinetic-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.full_name || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
