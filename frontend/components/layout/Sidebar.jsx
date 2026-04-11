"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard/shipments", label: "Expéditions" },
  { href: "/dashboard/products", label: "Produits" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/calculator", label: "Calculateur" },
];

const roleLinks = [
  { href: "/dashboard/importateur", label: "Espace importateur" },
  { href: "/dashboard/exportateur", label: "Espace exportateur" },
  { href: "/dashboard/transitaire", label: "Espace transitaire" },
  { href: "/dashboard/courtier", label: "Espace courtier" },
  { href: "/dashboard/admin", label: "Administration" },
];

export function Sidebar() {
  const pathname = usePathname();

  function active(href) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-rail/95 px-4 py-6">
      <Link href="/dashboard" className="px-2">
        <p className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">
          GlobalTradeX
        </p>
        <p className="text-xs text-mist">Pilotage des flux</p>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1 text-sm">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/80">
          Opérations
        </p>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              active(l.href)
                ? "bg-brass/15 text-brass"
                : "text-mist hover:bg-panel hover:text-[var(--text)]"
            }`}
          >
            {l.label}
          </Link>
        ))}

        <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/80">
          Rôles
        </p>
        {roleLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              active(l.href)
                ? "bg-sea/10 text-sea"
                : "text-mist hover:bg-panel hover:text-[var(--text)]"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <p className="mt-auto px-2 text-[10px] leading-relaxed text-mist/70">
        Données sensibles : vérifiez vos déclarations auprès des autorités compétentes.
      </p>
    </aside>
  );
}
