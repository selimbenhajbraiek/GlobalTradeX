"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { analyticsApi } from "@/lib/api";

const ACCENT = "#533AB7";
const SURFACE = "#EEEDFE";

const Bar = dynamic(
  async () => {
    const chartjs = await import("chart.js");
    const reactChart = await import("react-chartjs-2");
    chartjs.Chart.register(
      chartjs.CategoryScale,
      chartjs.LinearScale,
      chartjs.BarElement,
      chartjs.Title,
      chartjs.Tooltip,
      chartjs.Legend
    );
    return reactChart.Bar;
  },
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-white/60" /> }
);

function formatMoney(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function AdminAnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [global, setGlobal] = useState(null);
  const [docs, setDocs] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, d] = await Promise.all([analyticsApi.global(), analyticsApi.documents()]);
      setGlobal(g.data);
      setDocs(d.data);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusChart = useMemo(() => {
    const by = global?.shipments_by_status || {};
    const labels = Object.keys(by);
    const data = labels.map((k) => by[k]);
    return {
      labels: labels.map((k) => String(k).replace(/_/g, " ")),
      datasets: [
        {
          label: "Shipments",
          data,
          backgroundColor: ACCENT,
          borderRadius: 8,
          maxBarThickness: 40,
        },
      ],
    };
  }, [global]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Shipments by status",
          color: "#1e1b4b",
          font: { size: 14, weight: "600" },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#4338ca" } },
        y: { beginAtZero: true, ticks: { stepSize: 1, color: "#4338ca" } },
      },
    }),
    []
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-mist">
            Platform-wide KPIs and document verification (admin only).
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-panel"
          style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
        >
          ← Admin overview
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 text-sm" style={{ color: ACCENT }}>
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          Loading analytics…
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total users", value: global?.total_users ?? "—" },
          { label: "Total shipments", value: global?.total_shipments ?? "—" },
          { label: "Total documents", value: global?.total_documents ?? "—" },
          { label: "Total est. value", value: formatMoney(global?.total_estimated_value) },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border px-5 py-4 shadow-sm"
            style={{ backgroundColor: SURFACE, borderColor: `${ACCENT}33` }}
          >
            <p className="text-xs font-medium uppercase tracking-wide opacity-80" style={{ color: ACCENT }}>
              {k.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: ACCENT }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Monthly revenue", value: formatMoney(global?.monthly_revenue) },
          { label: "Delay rate", value: `${Number(global?.delay_rate_percent ?? 0).toFixed(1)} %` },
          { label: "Documents verified", value: docs?.verified ?? "—" },
          { label: "Pending review", value: docs?.pending_review ?? "—" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{k.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border p-6 shadow-sm"
        style={{ backgroundColor: SURFACE, borderColor: `${ACCENT}33` }}
      >
        <div className="h-72 w-full">
          <Bar data={statusChart} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminAnalyticsContent />
    </RoleGuard>
  );
}
