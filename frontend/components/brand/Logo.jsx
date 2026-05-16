import Link from "next/link";

export function Logo({ className = "", href = "/", size = "default", variant = "light" }) {
  const iconSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const textSize = size === "sm" ? "text-base" : "text-xl";

  const wordmarkClass =
    variant === "dark"
      ? "text-primary-foreground"
      : "text-foreground";

  const content = (
    <>
      <span className={`relative inline-flex shrink-0 ${iconSize}`}>
        <span className="flex h-full w-full items-center justify-center rounded-md bg-foreground shadow-elevated">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-background" aria-hidden>
            <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="12" cy="12" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <path d="M5 12h14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          </svg>
        </span>
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-kinetic shadow-glow"
          aria-hidden
        />
      </span>
      <span className={`font-display ${textSize} leading-none ${wordmarkClass}`}>
        <span className="font-normal">Global</span>
        <span className="italic">TradeX</span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
        {content}
      </Link>
    );
  }

  return <span className={`inline-flex items-center gap-2.5 ${className}`}>{content}</span>;
}
