import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Logo } from "@/components/brand/Logo";

export const metadata = {
  title: "Forgot password — GlobalTradeX",
};

export default function ForgotPasswordPage() {
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

      <form className="mt-8 space-y-5" action="#" method="post">
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="input-field mt-1.5"
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          Send reset link
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-kinetic hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
