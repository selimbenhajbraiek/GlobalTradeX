"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Logo } from "@/components/brand/Logo";
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
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
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
    setUnverifiedEmail("");
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
      if (err?.response?.status === 403 && typeof detail === "string" && detail.includes("verified")) {
        setUnverifiedEmail(email.trim());
      }
      setError(typeof msg === "string" ? msg : t("auth.signInFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Welcome back"
      headline="Pick up where your network left off."
      quote="GlobalTradeX is the first platform our forwarders, customs and finance team all log into."
      attribution="— Marta Lindqvist, VP Logistics, Equinox"
    >
      <div className="relative">
        <div className="absolute end-0 top-0">
          <CompactLanguageSwitcher variant="light" />
        </div>
        <Logo href="/" className="hidden lg:flex" />
        <h1 className="mt-8 font-display text-3xl text-foreground">{t("auth.signIn")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-medium text-kinetic hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="input-field mt-1.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-kinetic focus:ring-kinetic"
          />
          Remember me
        </label>

        <button type="submit" className="btn-primary w-full" disabled={pending || isLoading}>
          {pending ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner className="h-5 w-5 border-2 border-background/40 border-t-background" />
              {t("auth.signingIn")}
            </span>
          ) : (
            <>
              Continue
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </>
          )}
        </button>
      </form>

      {error ? (
        <p
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {unverifiedEmail ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          <Link
            href={`/check-email?email=${encodeURIComponent(unverifiedEmail)}`}
            className="font-medium text-kinetic hover:underline"
          >
            Resend verification email
          </Link>
        </p>
      ) : null}

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <p className="relative mx-auto w-fit bg-background px-3 text-xs text-muted-foreground">OR</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-secondary w-full justify-center">
          Google
        </button>
        <button type="button" className="btn-secondary w-full justify-center">
          SSO
        </button>
      </div>
    </AuthSplitLayout>
  );
}
