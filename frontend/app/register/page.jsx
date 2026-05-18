"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Logo } from "@/components/brand/Logo";
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
      router.replace(`/check-email?email=${encodeURIComponent(email.trim())}`);
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
    <AuthSplitLayout
      eyebrow="Onboarding"
      headline="One workspace. Every leg of the journey."
      quote="GlobalTradeX is the first platform our forwarders, customs and finance team all log into."
      attribution="— Marta Lindqvist, VP Logistics, Equinox"
    >
      <div className="relative">
        <div className="absolute end-0 top-0">
          <CompactLanguageSwitcher variant="light" />
        </div>
        <Logo href="/" className="hidden lg:flex" />
        <h1 className="mt-8 font-display text-3xl text-foreground">Create workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Already have one?{" "}
          <Link href="/login" className="font-medium text-kinetic hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Marta Lindqvist"
            className="input-field mt-1.5"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
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
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            {t("register.passwordHint")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input-field mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner className="h-4 w-4 border-2 border-background/40 border-t-background" />
              {t("register.creating")}
            </span>
          ) : (
            <>
              Create workspace
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        By continuing you agree to our Terms &amp; Privacy. SSO and SCIM available on Growth and
        Enterprise.
      </p>
    </AuthSplitLayout>
  );
}
