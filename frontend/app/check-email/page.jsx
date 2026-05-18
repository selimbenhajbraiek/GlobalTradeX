"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Logo } from "@/components/brand/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { authApi } from "@/lib/api";

function CheckEmailInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function resend() {
    if (!email) return;
    setError("");
    setPending(true);
    try {
      await authApi.resendVerification(email);
      setSent(true);
    } catch (err) {
      const raw = err?.response?.data?.detail;
      setError(typeof raw === "string" ? raw : "Could not resend email.");
    } finally {
      setPending(false);
    }
  }

  return (
  <>
      <h1 className="mt-8 font-display text-3xl text-foreground">Check your inbox</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a verification link{email ? ` to ${email}` : ""}. Open it to activate your account, then sign in.
      </p>

      {sent ? (
        <p className="mt-6 text-sm text-success">A new verification email was sent if your account is pending.</p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {email ? (
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          className="btn-secondary mt-6 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Resend verification email"}
        </button>
      ) : null}

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-kinetic hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export default function CheckEmailPage() {
  return (
    <AuthSplitLayout
      eyebrow="Onboarding"
      headline="One more step."
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
        <CheckEmailInner />
      </Suspense>
    </AuthSplitLayout>
  );
}
