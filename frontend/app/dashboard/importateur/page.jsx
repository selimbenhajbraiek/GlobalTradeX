"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { analyticsApi, notificationsApi, shipmentsApi } from "@/lib/api";

const BG = "#E6F1FB";
const ACCENT = "#185FA5";

const Line = dynamic(
  async () => {
    const chartjs = await import("chart.js");
    const reactChart = await import("react-chartjs-2");
    chartjs.Chart.register(
      chartjs.CategoryScale,
      chartjs.LinearScale,
      chartjs.PointElement,
      chartjs.LineElement,
      chartjs.Title,
      chartjs.Tooltip,
      chartjs.Legend,
      chartjs.Filler
    );
    return reactChart.Line;
  },
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-white/60" /> }
);

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function formatDeparture(value) {
  if (value == null || value === "") return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    pending: "bg-amber-100 text-amber-900 ring-amber-200",
    in_transit: "bg-sky-100 text-sky-900 ring-sky-200",
    delayed: "bg-red-100 text-red-800 ring-red-200",
    customs_hold: "bg-violet-100 text-violet-900 ring-violet-200",
    cancelled: "bg-gray-200 text-gray-700 ring-gray-300",
  };
  return map[s] || "bg-white/80 text-gray-800 ring-gray-200";
}

/** Green = delivered, orange = pending, red = delayed — inferred from text. */
function notificationAccent(n) {
  const text = `${n.title || ""} ${n.message || ""}`.toLowerCase();
  if (text.includes("delayed") || text.includes("delay")) {
    return {
      border: "border-red-200",
      iconBg: "bg-red-500",
      icon: (
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    };
  }
  if (text.includes("pending")) {
    return {
      border: "border-orange-200",
      iconBg: "bg-orange-500",
      icon: (
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };
  }
  if (text.includes("delivered")) {
    return {
      border: "border-emerald-200",
      iconBg: "bg-emerald-500",
      icon: (
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    };
  }
  return {
    border: "border-sky-200",
    iconBg: "bg-[#185FA5]",
    icon: (
      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  };
}

function ImportateurDashboardInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [successToast, setSuccessToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipRes, analyticsRes, notifRes] = await Promise.all([
        shipmentsApi.getAll({ mine_only: true }),
        analyticsApi.shipments(),
        notificationsApi.list({ limit: 5, unread_only: true }),
      ]);
      setShipments(shipRes.data || []);
      setStats(analyticsRes.data);
      setNotifications(notifRes.data || []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const msg = sessionStorage.getItem("gtx_shipment_created_toast");
    if (msg) {
      sessionStorage.removeItem("gtx_shipment_created_toast");
      setSuccessToast(msg);
      const t = setTimeout(() => setSuccessToast(null), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  const recentFive = useMemo(() => {
    return [...shipments]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [shipments]);

  const lineData = useMemo(() => {
    const months = stats?.by_month || [];
    const labels = months.map((m) => {
      const [y, mo] = String(m.month).split("-");
      const d = new Date(Date.UTC(Number(y), Number(mo) - 1, 1));
      return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    });
    const data = months.map((m) => Number(m.count) || 0);
    return {
      labels,
      datasets: [
        {
          label: "Shipments",
          data,
          borderColor: ACCENT,
          backgroundColor: `${ACCENT}33`,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: ACCENT,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    };
  }, [stats]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Shipments per month (last 6 months)",
          color: "#0f172a",
          font: { size: 14, weight: "600" },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(24, 95, 165, 0.08)" },
          ticks: { color: "#185FA5" },
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: "#185FA5" },
          grid: { color: "rgba(24, 95, 165, 0.08)" },
        },
      },
    }),
    []
  );

  const kpis = [
    { label: "Total Shipments", value: stats?.total_shipments ?? "—" },
    { label: "Pending", value: stats?.pending ?? "—" },
    { label: "In Transit", value: stats?.in_transit ?? "—" },
    { label: "Delivered", value: stats?.delivered ?? "—" },
  ];

  return (
    <div className="space-y-8">
      {successToast ? (
        <div
          className="fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl border border-emerald-500/50 bg-emerald-950/95 px-4 py-3 text-sm text-emerald-50 shadow-lg shadow-black/40"
          role="status"
        >
          {successToast}
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold" style={{ color: ACCENT }}>
            Importer workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Track incoming shipments, alerts, and trends for your account.
          </p>
        </div>
        <Link
          href="/dashboard/shipments/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{ backgroundColor: ACCENT }}
        >
          Create New Shipment
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
          Loading…
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-white/80 px-4 py-4 shadow-sm"
                style={{ backgroundColor: BG }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide opacity-90" style={{ color: ACCENT }}>
                  {k.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{k.value}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border border-white/80 p-4 shadow-sm sm:p-6"
            style={{ backgroundColor: BG }}
          >
            <div className="h-72 w-full">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>

          <div
            className="rounded-2xl border border-white/80 p-4 shadow-sm sm:p-6"
            style={{ backgroundColor: BG }}
          >
            <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
              Recent Shipments
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/60 bg-white/80">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">Reference</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Origin</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Destination</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Departure Date</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentFive.map((sh) => (
                    <tr key={sh.id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{sh.reference}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-gray-600" title={sh.origin}>
                        {sh.origin || "—"}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-gray-600" title={sh.destination}>
                        {sh.destination || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusBadgeClass(
                            sh.status
                          )}`}
                        >
                          {String(sh.status).replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDeparture(sh.departure_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/dashboard/shipments/${sh.id}`}
                          className="inline-flex rounded-lg border px-3 py-1 text-xs font-medium transition hover:bg-white"
                          style={{ borderColor: ACCENT, color: ACCENT }}
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentFive.length === 0 && !loading ? (
                <p className="p-6 text-center text-sm text-gray-500">No shipments yet.</p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:col-span-1">
          <div
            className="sticky top-4 rounded-2xl border border-white/80 p-4 shadow-sm"
            style={{ backgroundColor: BG }}
          >
            <h2 className="mb-3 text-lg font-semibold" style={{ color: ACCENT }}>
              Alerts
            </h2>
            <ul className="space-y-3">
              {notifications.length === 0 && !loading ? (
                <li className="text-sm text-gray-500">No unread notifications.</li>
              ) : null}
              {notifications.map((n) => {
                const v = notificationAccent(n);
                return (
                  <li
                    key={n.id}
                    className={`flex gap-3 rounded-xl border bg-white/90 p-3 shadow-sm ${v.border}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${v.iconBg}`}
                    >
                      {v.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.message}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
                        {n.created_at
                          ? new Date(n.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ImportateurPage() {
  return (
    <RoleGuard allowedRoles={["importateur", "admin"]}>
      <ImportateurDashboardInner />
    </RoleGuard>
  );
}
