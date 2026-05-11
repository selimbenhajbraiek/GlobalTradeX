"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Calculator,
  FileSearch,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  PlusCircle,
  RefreshCw,
  Settings,
  User,
  Users,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

const ROLE_HOME = {
  admin: "/dashboard/admin",
  importateur: "/dashboard/importateur",
  exportateur: "/dashboard/exportateur",
  transitaire: "/dashboard/transitaire",
  courtier: "/dashboard/courtier",
};

const NAV_ITEMS = [
  {
    key: "dashboard",
    labelKey: "nav.dashboard",
    href: "__HOME__",
    icon: LayoutDashboard,
    roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"],
    homeExact: true,
  },
  {
    key: "admin-users",
    labelKey: "nav.userManagement",
    href: "/dashboard/admin/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    key: "admin-shipments",
    labelKey: "nav.allShipments",
    href: "/dashboard/shipments",
    icon: Package,
    roles: ["admin"],
  },
  {
    key: "admin-analytics",
    labelKey: "nav.analytics",
    href: "/dashboard/admin/analytics",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    key: "admin-assistant-avatar",
    labelKey: "nav.avatarAssistant",
    href: "/dashboard/admin/assistant-avatar",
    icon: User,
    roles: ["admin"],
  },
  {
    key: "imp-shipments",
    labelKey: "nav.myShipments",
    href: "/dashboard/shipments",
    icon: Package,
    roles: ["importateur"],
  },
  {
    key: "imp-new",
    labelKey: "nav.newShipment",
    href: "/dashboard/shipments/new",
    icon: PlusCircle,
    roles: ["importateur"],
  },
  {
    key: "imp-calculator",
    labelKey: "nav.routeOptimizer",
    href: "/dashboard/calculator",
    icon: Calculator,
    roles: ["importateur"],
  },
  {
    key: "imp-docs",
    labelKey: "nav.myDocuments",
    href: "/dashboard/documents",
    icon: FileText,
    roles: ["importateur"],
  },
  {
    key: "exp-products",
    labelKey: "nav.myProducts",
    href: "/dashboard/products",
    icon: Boxes,
    roles: ["exportateur"],
  },
  {
    key: "exp-new-shipment",
    labelKey: "nav.newShipment",
    href: "/dashboard/shipments/new",
    icon: PlusCircle,
    roles: ["exportateur"],
  },
  {
    key: "exp-shipments",
    labelKey: "nav.myShipments",
    href: "/dashboard/shipments",
    icon: Package,
    roles: ["exportateur"],
  },
  {
    key: "exp-docs",
    labelKey: "nav.myDocuments",
    href: "/dashboard/documents",
    icon: FileText,
    roles: ["exportateur"],
  },
  {
    key: "ff-active",
    labelKey: "nav.activeShipments",
    href: "/dashboard/shipments",
    icon: Activity,
    roles: ["transitaire"],
  },
  {
    key: "ff-status",
    labelKey: "nav.updateStatus",
    href: "/dashboard/shipments",
    icon: RefreshCw,
    roles: ["transitaire"],
  },
  {
    key: "cb-docs",
    labelKey: "nav.documentReview",
    href: "/dashboard/documents",
    icon: FileSearch,
    roles: ["courtier"],
  },
  {
    key: "cb-shipments",
    labelKey: "nav.allShipments",
    href: "/dashboard/shipments",
    icon: Package,
    roles: ["courtier"],
  },
  {
    key: "live-gps",
    labelKey: "nav.liveTracking",
    href: "/dashboard/shipments/tracking",
    icon: MapPin,
    roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"],
  },
  {
    key: "settings",
    labelKey: "nav.settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"],
  },
  {
    key: "profile",
    labelKey: "nav.profile",
    href: "/dashboard/profile",
    icon: User,
    roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"],
  },
  {
    key: "notifications",
    labelKey: "nav.notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"],
  },
];

function resolveHref(item, role) {
  if (item.href === "__HOME__") {
    return ROLE_HOME[role] || "/dashboard";
  }
  return item.href;
}

function isActive(pathname, href, exact) {
  if (exact) {
    return pathname === href || pathname === `${href}/`;
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function filterNavForRole(role) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => ({
    ...item,
    href: resolveHref(item, role),
  }));
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const { t } = useLocale();
  const role = user?.role;

  const links = useMemo(() => filterNavForRole(role), [role]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-line bg-rail/95 px-4 py-6">
      <Link href={role ? ROLE_HOME[role] || "/dashboard" : "/dashboard"} className="px-2">
        <p className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">{t("common.brand")}</p>
        <p className="text-xs text-mist">{t("common.tagline")}</p>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1 text-sm" aria-label="Main">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/80">
          {t("nav.sectionMain")}
        </p>
        {isLoading ? (
          <div className="space-y-2 px-2 py-4">
            <div className="h-9 animate-pulse rounded-lg bg-panel" />
            <div className="h-9 animate-pulse rounded-lg bg-panel" />
            <div className="h-9 animate-pulse rounded-lg bg-panel" />
          </div>
        ) : (
          links.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href, item.homeExact);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition ${
                  active
                    ? "bg-brass/15 text-brass"
                    : "text-mist hover:bg-panel hover:text-[var(--text)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })
        )}

        {!isLoading && role ? (
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start font-medium text-mist transition hover:bg-panel hover:text-[var(--text)]"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t("nav.signOut")}</span>
          </button>
        ) : null}
      </nav>

      <p className="mt-auto px-2 text-[10px] leading-relaxed text-mist/70">{t("nav.sensitiveNotice")}</p>
    </aside>
  );
}
