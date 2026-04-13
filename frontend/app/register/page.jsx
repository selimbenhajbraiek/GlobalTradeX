"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CompactLanguageSwitcher } from "@/components/i18n/CompactLanguageSwitcher";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await register({ email, password, full_name: fullName });
      router.replace("/login");
    } catch (err) {
      const raw = err?.response?.data?.detail;
      const msg = Array.isArray(raw)
        ? raw.map((d) => d.msg || d).join(", ")
        : raw || err?.message || t("register.failed");
      setError(typeof msg === "string" ? msg : t("register.failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="relative glass rounded-2xl p-8 shadow-lift">
        <div className="absolute end-3 top-3">
          <CompactLanguageSwitcher variant="light" />
        </div>

        <p className="pt-6 font-display text-xs uppercase tracking-[0.35em] text-brass/90">GlobalTradeX</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--text)]">{t("register.title")}</h1>
        <p className="mt-2 text-sm text-mist">{t("register.subtitle")}</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs font-medium text-mist" htmlFor="fullName">
              {t("register.fullName")}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="input-field mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-mist" htmlFor="email">
              {t("auth.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-mist" htmlFor="password">
              {t("register.passwordHint")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="input-field mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary mt-2 w-full" disabled={pending}>
            {pending ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner className="h-4 w-4 border-2 border-ink/30 border-t-ink" />
                {t("register.creating")}
              </span>
            ) : (
              t("register.submit")
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mist">
          {t("register.alreadyHave")}{" "}
          <Link href="/login" className="font-medium text-brass hover:underline">
            {t("register.signInLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
