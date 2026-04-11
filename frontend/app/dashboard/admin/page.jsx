"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import RoleGuard from "@/components/RoleGuard";
import { analyticsApi, shipmentsApi } from "@/lib/api";

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

/** Last 6 calendar months (UTC), oldest → newest; counts shipments per month. */
function shipmentVolumeLast6Months(shipments) {
  const now = new Date();
  const labels = [];
  const keys = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    keys.push(key);
    labels.push(
      d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    );
  }
  const counts = keys.map((key) =>
    (shipments || []).filter((s) => {
      if (!s?.created_at) return false;
      const c = new Date(s.created_at);
      const k = `${c.getUTCFullYear()}-${String(c.getUTCMonth() + 1).padStart(2, "0")}`;
      return k === key;
    }).length
  );
  return { labels, counts };
}

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

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function AdminDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [shipments, setShipments] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, s] = await Promise.all([analyticsApi.global(), shipmentsApi.getAll()]);
      setAnalytics(a.data);
      setShipments(s.data);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const chartData = useMemo(() => {
    const { labels, counts } = shipmentVolumeLast6Months(shipments);
    return {
      labels,
      datasets: [
        {
          label: "Shipments",
          data: counts,
          backgroundColor: ACCENT,
          borderRadius: 8,
          maxBarThickness: 48,
        },
      ],
    };
  }, [shipments]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Shipment volume by month (last 6 months)",
          color: "#1e1b4b",
          font: { size: 14, weight: "600" },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#4338ca" },
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: "#4338ca" },
          grid: { color: "rgba(83, 58, 183, 0.08)" },
        },
      },
    }),
    []
  );

  const recentShipments = useMemo(() => {
    return [...(shipments || [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15);
  }, [shipments]);

  const kpiLoading = loading && !analytics;

  return (
    <div className="space-y-8" style={{ "--admin-accent": ACCENT, "--admin-surface": SURFACE }}>
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Global KPIs, user management, and shipments fed by the live API.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/users"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-panel"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
          >
            User management (full page)
          </Link>
          <Link
            href="/dashboard/admin/analytics"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-panel"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
          >
            Analytics (full page)
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading && (
        <div className="flex items-center gap-3 text-sm" style={{ color: ACCENT }}>
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          Loading data…
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Users",
            value: kpiLoading ? "—" : analytics?.total_users ?? "—",
          },
          {
            label: "Total Shipments",
            value: kpiLoading ? "—" : analytics?.total_shipments ?? "—",
          },
          {
            label: "Monthly Revenue",
            value: kpiLoading ? "—" : formatMoney(analytics?.monthly_revenue),
          },
          {
            label: "Delay Rate",
            value:
              kpiLoading || analytics == null
                ? "—"
                : `${Number(analytics.delay_rate_percent ?? 0).toFixed(1)} %`,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-transparent px-5 py-4 shadow-sm transition-shadow"
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

      <div
        className="rounded-2xl border p-6 shadow-sm"
        style={{ backgroundColor: SURFACE, borderColor: `${ACCENT}33` }}
      >
        <div className="h-72 w-full">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          User management
        </h2>
        <AdminUsersPanel />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          Recent shipments
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Reference</th>
                <th className="px-4 py-3 font-medium text-gray-700">Owner</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Origin</th>
                <th className="px-4 py-3 font-medium text-gray-700">Destination</th>
                <th className="px-4 py-3 font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentShipments.map((sh) => {
                const ownerLabel = `User #${sh.owner_id}`;
                return (
                  <tr key={sh.id} className="hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {sh.reference}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{ownerLabel}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-[#EEEDFE] px-2 py-0.5 text-xs font-medium capitalize text-[#533AB7]">
                        {String(sh.status).replace("_", " ")}
                      </span>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-gray-600" title={sh.origin}>
                      {sh.origin || "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-gray-600" title={sh.destination}>
                      {sh.destination || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(sh.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recentShipments.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">No shipments.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}
