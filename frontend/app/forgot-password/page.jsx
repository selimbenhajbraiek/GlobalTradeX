"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Logo } from "@/components/brand/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const raw = err?.response?.data?.detail;
      setError(typeof raw === "string" ? raw : err?.message || "Could not send reset email.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Account recovery"
      headline="We'll get you back on the network."
      quote="GlobalTradeX is the first platform our forwarders, customs and finance team all log into."
      attribution="— Marta Lindqvist, VP Logistics, Equinox"
    >
      <Logo href="/" className="hidden lg:flex" />
      <h1 className="mt-8 font-display text-3xl text-foreground">Reset password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your work email and we&apos;ll send a reset link.
      </p>

      {sent ? (
        <div className="mt-8 rounded-lg border border-border bg-card px-4 py-4 text-sm text-foreground shadow-paper">
          <p>
            If an account exists for that email, we sent password reset instructions. Check your inbox
            (and spam folder).
          </p>
          <Link href="/login" className="mt-4 inline-block font-medium text-kinetic hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input-field mt-1.5"
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
                Sending…
              </span>
            ) : (
              <>
                Send reset link
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </button>
        </form>
      )}

      {!sent ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-kinetic hover:underline">
            Back to sign in
          </Link>
        </p>
      ) : null}
    </AuthSplitLayout>
  );
}
