"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight } from "lucide-react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Logo } from "@/components/brand/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { authApi } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Reset link is invalid or missing. Request a new one from the forgot password page.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err) {
      const raw = err?.response?.data?.detail;
      setError(typeof raw === "string" ? raw : err?.message || "Could not reset password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mt-8 font-display text-3xl text-foreground">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">Must be at least 8 characters.</p>

      {done ? (
        <div className="mt-8 rounded-lg border border-border bg-card px-4 py-4 text-sm text-foreground shadow-paper">
          Password updated. Redirecting to sign in…
        </div>
      ) : (
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
                Saving…
              </span>
            ) : (
              <>
                Update password
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-kinetic hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthSplitLayout
      eyebrow="Account recovery"
      headline="Secure your workspace."
      quote="GlobalTradeX is the first platform our forwarders, customs and finance team all log into."
      attribution="— Marta Lindqvist, VP Logistics, Equinox"
    >
      <Logo href="/" className="hidden lg:flex" />
      <Suspense
        fallback={
          <div className="mt-12 flex justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
