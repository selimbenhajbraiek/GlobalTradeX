"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { useLocale } from "@/context/LocaleContext";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/messages/translations";

const ACCENT = "#d4a24a";

export default function SettingsPage() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">{t("settings.title")}</h1>
          <p className="mt-2 max-w-xl text-sm text-mist">{t("settings.subtitle")}</p>
        </div>
        <Link href="/dashboard/profile" className="btn-ghost text-sm">
          ← {t("nav.profile")}
        </Link>
      </div>

      <section
        className="rounded-2xl border border-line/80 bg-panel/40 p-6 shadow-lift backdrop-blur-sm"
        style={{ borderColor: "rgba(212, 162, 74, 0.2)" }}
      >
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">{t("settings.languageSection")}</h2>
        <p className="mt-2 text-sm text-mist">{t("settings.languageHelp")}</p>

        <ul className="mt-6 space-y-3">
          {SUPPORTED_LOCALES.map((code) => {
            const active = locale === code;
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => setLocale(code)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left text-sm transition ${
                    active
                      ? "border-brass/50 bg-brass/10 text-[var(--text)]"
                      : "border-line/60 bg-rail/40 text-mist hover:border-brass/25 hover:text-[var(--text)]"
                  }`}
                >
                  <span className="font-medium">{LOCALE_LABELS[code]}</span>
                  <span className="flex items-center gap-2 text-xs text-mist">
                    {active ? (
                      <>
                        <Check className="h-4 w-4 text-brass" aria-hidden />
                        <span style={{ color: ACCENT }}>{t("settings.current")}</span>
                      </>
                    ) : (
                      <span className="text-mist/70">{t(`settings.${code}`)}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-xs leading-relaxed text-mist/80">{t("settings.savedHint")}</p>
      </section>
    </div>
  );
}
