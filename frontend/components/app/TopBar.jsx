"use client";

import Link from "next/link";
import { Bell, Plus, Search, Sparkles } from "lucide-react";

export function TopBar({ breadcrumb = ["EQUINOX GOODS", "Production"] }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
        {breadcrumb.map((part, i) => (
          <span key={part}>
            {i > 0 ? <span className="mx-1.5 text-border">/</span> : null}
            <span className={i === breadcrumb.length - 1 ? "text-foreground" : ""}>{part}</span>
          </span>
        ))}
      </p>

      <div className="flex items-center gap-2">
        <label className="relative hidden sm:block">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search"
            className="h-9 w-44 rounded-full border border-border bg-card ps-9 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-52"
          />
        </label>

        <Link
          href="/dashboard/assistant"
          className="btn-kinetic hidden h-9 gap-1.5 rounded-full px-3 sm:inline-flex"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Ask AI
        </Link>

        <Link
          href="/dashboard/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          <span
            className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-kinetic"
            aria-hidden
          />
        </Link>

        <Link href="/dashboard/shipments/new" className="btn-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New shipment
        </Link>
      </div>
    </header>
  );
}
