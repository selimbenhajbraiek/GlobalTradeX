/** Sidebar navigation filtered by authenticated role. */

const WORKSPACE = [
  { label: "Overview", href: "/dashboard/admin", iconKey: "LayoutDashboard", exact: true, roles: ["admin"] },
  { label: "Overview", href: "/dashboard/importateur", iconKey: "LayoutDashboard", exact: true, roles: ["importateur"] },
  { label: "Overview", href: "/dashboard/exportateur", iconKey: "LayoutDashboard", exact: true, roles: ["exportateur"] },
  { label: "Overview", href: "/dashboard/courtier", iconKey: "LayoutDashboard", exact: true, roles: ["courtier"] },
  { label: "Overview", href: "/dashboard/transitaire", iconKey: "LayoutDashboard", exact: true, roles: ["transitaire"] },
  { label: "Shipments", href: "/dashboard/shipments", iconKey: "Package", roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"] },
  { label: "Analytics", href: "/dashboard/admin/analytics", iconKey: "BarChart3", roles: ["admin"] },
  { label: "Documents", href: "/dashboard/documents", iconKey: "FileText", roles: ["admin", "importateur", "exportateur", "courtier"] },
  { label: "Products", href: "/dashboard/products", iconKey: "Package", roles: ["exportateur", "admin"] },
  { label: "Calculator", href: "/dashboard/calculator", iconKey: "BarChart3", roles: ["importateur", "admin"] },
  { label: "Forwarder", href: "/dashboard/transitaire", iconKey: "Truck", roles: ["transitaire", "admin"] },
];

const ROLES = [
  { label: "Importer", href: "/dashboard/importateur", iconKey: "Truck", roles: ["admin", "importateur"] },
  { label: "Exporter", href: "/dashboard/exportateur", iconKey: "Users", roles: ["admin", "exportateur"] },
  { label: "Customs", href: "/dashboard/courtier", iconKey: "Shield", roles: ["admin", "courtier"] },
];

const INTELLIGENCE = [
  { label: "AI Assistant", href: "/dashboard/assistant", iconKey: "Sparkles", roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"] },
  { label: "Messages", href: "/dashboard/messages", iconKey: "MessageSquare", roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"] },
  { label: "Notifications", href: "/dashboard/notifications", iconKey: "Bell", roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"], badge: true },
];

const ACCOUNT = [
  { label: "Settings", href: "/dashboard/settings", iconKey: "Settings", roles: ["admin", "importateur", "exportateur", "transitaire", "courtier"] },
];

export const ROLE_HOME = {
  admin: "/dashboard/admin",
  importateur: "/dashboard/importateur",
  exportateur: "/dashboard/exportateur",
  courtier: "/dashboard/courtier",
  transitaire: "/dashboard/transitaire",
};

export const ROLE_LABELS = {
  admin: "Administrator",
  importateur: "Importer",
  exportateur: "Exporter",
  courtier: "Customs broker",
  transitaire: "Freight forwarder",
};

function filterByRole(items, role) {
  const r = role || "importateur";
  return items.filter((item) => !item.roles || item.roles.includes(r));
}

export function navForRole(role) {
  return {
    workspace: filterByRole(WORKSPACE, role),
    roles: filterByRole(ROLES, role),
    intelligence: filterByRole(INTELLIGENCE, role),
    account: filterByRole(ACCOUNT, role),
    home: ROLE_HOME[role] || "/dashboard/admin",
  };
}
