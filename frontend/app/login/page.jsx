"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CompactLanguageSwitcher } from "@/components/i18n/CompactLanguageSwitcher";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

export default function LoginPage() {
  const { login, user, token, isLoading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (user && token) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, token, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password);
    } catch (err) {
      const raw = err?.response?.data;
      const detail =
        raw?.detail ??
        raw?.error?.message ??
        (typeof raw?.error === "string" ? raw.error : null);
      const msg =
        (typeof detail === "string" ? detail : null) ||
        err?.message ||
        t("auth.signInFailed");
      setError(typeof msg === "string" ? msg : t("auth.signInFailed"));
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="absolute end-3 top-3">
          <CompactLanguageSwitcher variant="light" />
        </div>

        <div className="pt-8 text-center">
          <p className="font-display text-sm font-semibold tracking-wide text-blue-700">
            GlobalTradeX
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-gray-900">{t("auth.signIn")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("auth.signInSubtitle")}</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="email">
              {t("auth.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              {t("auth.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>

          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending || isLoading}
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="h-5 w-5 border-2 border-white/40 border-t-white" />
                {t("auth.signingIn")}
              </span>
            ) : (
              t("auth.signInButton")
            )}
          </button>
        </form>

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
    </main>
  );
}
