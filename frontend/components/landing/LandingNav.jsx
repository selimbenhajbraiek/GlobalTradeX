"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#solutions", label: "Solutions" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#pricing", label: "Pricing" },
  { href: "#docs", label: "Docs" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="landing-container flex h-14 items-center justify-between gap-6">
        <Logo href="/" />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link href="/login" className="btn-primary">
            Launch dashboard
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
