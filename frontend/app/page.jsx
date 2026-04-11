"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import api from "@/lib/api";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [payload, setPayload] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, status } = await api.get("/api/health");
        if (!cancelled) {
          setOk(status >= 200 && status < 300);
          setPayload(data);
          setErrorDetail(null);
        }
      } catch (err) {
        if (!cancelled) {
          setOk(false);
          setPayload(null);
          setErrorDetail({
            message: err?.message,
            status: err?.response?.status,
            data: err?.response?.data,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              GlobalTradeX
            </h1>
            <p className="mt-1 text-sm text-slate-500">Backend connection test</p>
          </div>
          <div
            className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
              loading ? "bg-slate-300" : ok ? "bg-emerald-500" : "bg-red-500"
            }`}
            title={loading ? "Checking…" : ok ? "Connected" : "Error"}
            aria-hidden
          />
        </div>

        <p className="mt-6 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
          <span className="font-semibold text-slate-700">NEXT_PUBLIC_API_URL:</span>{" "}
          {apiBaseUrl || "(empty — relative requests)"}
        </p>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-500">Contacting /api/health…</p>
          ) : ok ? (
            <div>
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                Backend FastAPI is connected!
              </p>
              <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-3 text-left text-xs text-emerald-100">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                Connection Error
              </p>
              <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-red-100 bg-red-950/5 p-3 text-left text-xs text-red-900">
                {JSON.stringify(errorDetail, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            Go to login
          </Link>
        </p>
      </div>
    </main>
  );
}
