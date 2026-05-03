"use client";

import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("token");
    router.replace(token ? "/dashboard" : "/login");
    setLoading(false);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
          aria-hidden
        />
        {loading ? "Redirecting..." : "Opening your workspace..."}
      </div>
    </main>
  );
}
