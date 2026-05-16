import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: ["Tracking", "Customs AI", "Documents", "Assistant", "API"],
  },
  {
    title: "Solutions",
    links: ["Importers", "Exporters", "Customs", "Brokers", "3PLs"],
  },
  {
    title: "Company",
    links: ["About", "Customers", "Careers", "Press", "Contact"],
  },
  {
    title: "Resources",
    links: ["Docs", "Changelog", "Status", "Security", "Trust center"],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="landing-container py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo href="/" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The operating system for global commerce. Engineered in Rotterdam, Singapore and New
              York.
            </p>
            <form className="mt-6 flex max-w-md gap-2" action="#" method="post">
              <input
                type="email"
                placeholder="you@company.com"
                className="input-field flex-1"
                aria-label="Email for newsletter"
              />
              <button type="submit" className="btn-primary shrink-0">
                Subscribe
              </button>
            </form>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow text-foreground/80">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              All systems operational
            </span>
            <span className="text-xs text-muted-foreground">© 2026 GlobalTradeX, Inc.</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Cookies
            </Link>
            <span className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[10px]">
              EN · English
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
