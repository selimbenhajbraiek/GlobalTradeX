import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { WorldMap } from "@/components/brand/WorldMap";

export function AuthSplitLayout({
  eyebrow,
  headline,
  quote,
  attribution,
  children,
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-ink p-10 text-primary-foreground lg:flex">
        <Logo href="/" variant="dark" />
        <div className="relative flex flex-1 items-center justify-center py-12">
          <WorldMap compact className="w-full max-w-md opacity-90" />
        </div>
        <div>
          <p className="eyebrow text-primary-foreground/50">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight xl:text-4xl">
            {headline}
          </h1>
          {quote ? (
            <blockquote className="mt-8 border-l border-primary-foreground/20 pl-4">
              <p className="font-display text-lg leading-snug text-primary-foreground/90">
                &ldquo;{quote}&rdquo;
              </p>
              {attribution ? (
                <footer className="mt-3 text-sm text-primary-foreground/50">{attribution}</footer>
              ) : null}
            </blockquote>
          ) : null}
        </div>
      </aside>

      <div className="flex flex-col bg-background px-6 py-10 sm:px-10 lg:px-16">
        <div className="mb-8 lg:hidden">
          <Logo href="/" />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">{children}</div>
        <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Skip and explore the demo →
          </Link>
        </p>
      </div>
    </div>
  );
}
