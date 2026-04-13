"use client";

import { useLocale } from "@/context/LocaleContext";
import { LOCALE_LABELS } from "@/messages/translations";

/**
 * @param {{ className?: string, variant?: "dark" | "light" }} props
 * dark = dashboard shell (brass / line). light = login/register on white/gray.
 */
export function CompactLanguageSwitcher({ className = "", variant = "dark" }) {
  const { locale, setLocale, locales } = useLocale();
  const light = variant === "light";

  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-1.5 text-xs ${className}`}
      role="group"
      aria-label="Language"
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`rounded-md border px-2 py-1 font-medium transition ${
            light
              ? locale === l
                ? "border-blue-600 bg-blue-50 text-blue-800"
                : "border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-gray-50"
              : locale === l
                ? "border-brass/60 bg-brass/15 text-brass"
                : "border-line/80 text-mist hover:border-brass/30 hover:text-[var(--text)]"
          }`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
