"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Logo } from "@/components/brand/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { authApi } from "@/lib/api";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification link is invalid or missing.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authApi.verifyEmail(token);
        if (!cancelled) {
          setStatus("success");
          setMessage(data.message || "Email verified.");
          setTimeout(() => router.replace("/login"), 3000);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          const raw = err?.response?.data?.detail;
          setMessage(typeof raw === "string" ? raw : "Could not verify email. The link may have expired.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="mt-10">
      {status === "loading" ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoadingSpinner />
          Verifying your email…
        </div>
      ) : (
        <div
          className={`rounded-lg border px-4 py-4 text-sm shadow-paper ${
            status === "success"
              ? "border-success/30 bg-success/5 text-foreground"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {message}
        </div>
      )}
      {status === "success" ? (
        <p className="mt-4 text-sm text-muted-foreground">Redirecting to sign in…</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/check-email" className="font-medium text-kinetic hover:underline">
            Resend verification email
          </Link>
          {" · "}
          <Link href="/login" className="font-medium text-kinetic hover:underline">
            Sign in
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthSplitLayout
      eyebrow="Email verification"
      headline="Activate your workspace."
      quote="GlobalTradeX is the first platform our forwarders, customs and finance team all log into."
      attribution="— Marta Lindqvist, VP Logistics, Equinox"
    >
      <Logo href="/" className="hidden lg:flex" />
      <h1 className="mt-8 font-display text-3xl text-foreground">Verify email</h1>
      <Suspense
        fallback={
          <div className="mt-12 flex justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <VerifyEmailInner />
      </Suspense>
    </AuthSplitLayout>
  );
}
