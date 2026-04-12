"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import { analyticsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ACCENT = "#533AB7";
const SURFACE = "#EEEDFE";

const LineChart = dynamic(
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
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-violet-100/60" /> }
);

const DoughnutChart = dynamic(
  async () => {
    const chartjs = await import("chart.js");
    const reactChart = await import("react-chartjs-2");
    chartjs.Chart.register(chartjs.ArcElement, chartjs.Tooltip, chartjs.Legend);
    return reactChart.Doughnut;
  },
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-violet-100/60" /> }
);

const ROLE_OPTIONS = ["admin", "importateur", "exportateur", "transitaire", "courtier"];

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

function TrendBadge({ value, label }) {
  if (value === undefined || value === null) {
    return <span className="mt-1 block h-4 text-xs text-transparent">—</span>;
  }
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-slate-500">
        <Minus className="h-3.5 w-3.5" aria-hidden />
        {label ?? "vs prior month"} 0%
      </span>
    );
  }
  const up = n > 0;
  return (
    <span
      className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-emerald-700" : "text-rose-700"
      }`}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
      {up ? "+" : ""}
      {n.toFixed(1)}% {label ?? "vs prior month"}
    </span>
  );
}

function KpiSkeleton() {
  return (
    <div className="h-[88px] animate-pulse rounded-2xl border border-violet-200/50 bg-violet-100/40" />
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalData, setGlobalData] = useState(null);
  const [shipAnalytics, setShipAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userBusyId, setUserBusyId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    role: "importateur",
    password: "",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, s, u] = await Promise.all([
        analyticsApi.global(),
        analyticsApi.shipments(),
        usersApi.list({ limit: 500, skip: 0 }),
      ]);
      setGlobalData(g.data);
      setShipAnalytics(s.data);
      setUsers(Array.isArray(u.data) ? u.data : []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const trends = globalData?.kpi_trends || {};

  const lineChartData = useMemo(() => {
    const months = globalData?.shipments_by_month || [];
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
          backgroundColor: `${ACCENT}22`,
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
  }, [globalData]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Shipments per month (last 6 months)",
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

  const doughnutData = useMemo(() => {
    const sb = globalData?.shipments_by_status || {};
    const keys = ["pending", "in_transit", "delivered", "delayed", "customs_hold", "cancelled"];
    const labels = keys.map((k) => k.replace(/_/g, " "));
    const data = keys.map((k) => Number(sb[k]) || 0);
    const colors = ["#c4b5fd", "#818cf8", "#34d399", "#fb7185", "#a78bfa", "#94a3b8"];
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  }, [globalData]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#312e81", boxWidth: 12, font: { size: 11 } },
        },
        title: {
          display: true,
          text: "Shipments by status",
          color: "#1e1b4b",
          font: { size: 14, weight: "600" },
        },
      },
    }),
    []
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const recentShipments = shipAnalytics?.recent_shipments || [];

  async function patchUser(id, body) {
    setUserBusyId(id);
    setError(null);
    try {
      const { data } = await usersApi.updateAdmin(id, body);
      setUsers((prev) => prev.map((x) => (x.id === id ? data : x)));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUserBusyId(null);
    }
  }

  async function submitNewUser(e) {
    e.preventDefault();
    setModalError("");
    if ((newUser.password || "").length < 8) {
      setModalError("Password must be at least 8 characters.");
      return;
    }
    setCreating(true);
    try {
      await usersApi.create({
        full_name: newUser.full_name.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
        password: newUser.password,
      });
      setModalOpen(false);
      setNewUser({ full_name: "", email: "", role: "importateur", password: "" });
      await loadAll();
    } catch (err) {
      setModalError(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  const kpiLoading = loading && !globalData;

  return (
    <div className="space-y-8" style={{ "--admin-accent": ACCENT, "--admin-surface": SURFACE }}>
      <div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Administration</h1>
        <p className="mt-1 text-sm font-medium" style={{ color: ACCENT }}>
          Wassim Braiek — platform oversight
        </p>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Monitor shipments, documents, and user accounts. All figures load from the live API.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          [
            {
              label: "Total users",
              value: globalData?.total_users ?? "—",
              trend: trends.users_percent,
            },
            {
              label: "Total shipments",
              value: globalData?.total_shipments ?? "—",
              trend: trends.shipments_percent,
            },
            {
              label: "Declared value (USD)",
              value: formatMoney(globalData?.total_declared_value_usd),
              trend: trends.declared_value_percent,
            },
            {
              label: "Delay rate",
              value:
                globalData == null
                  ? "—"
                  : `${Number(globalData.delay_rate_percent ?? 0).toFixed(1)}%`,
              trend: trends.delays_percent,
              trendLabel: "delay activity vs prior month",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border px-5 py-4 shadow-sm"
              style={{ backgroundColor: SURFACE, borderColor: `${ACCENT}33` }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90" style={{ color: ACCENT }}>
                {k.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{k.value}</p>
              <TrendBadge value={k.trend} label={k.trendLabel} />
            </div>
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="rounded-2xl border p-4 shadow-sm lg:p-6"
          style={{ backgroundColor: SURFACE, borderColor: `${ACCENT}33` }}
        >
          <div className="h-72 w-full">
            {loading && !globalData ? (
              <div className="h-full animate-pulse rounded-xl bg-violet-100/60" />
            ) : (
              <LineChart data={lineChartData} options={lineOptions} />
            )}
          </div>
        </div>
        <div
          className="rounded-2xl border p-4 shadow-sm lg:p-6"
          style={{ backgroundColor: SURFACE, borderColor: `${ACCENT}33` }}
        >
          <div className="mx-auto h-72 max-w-sm">
            {loading && !globalData ? (
              <div className="h-full animate-pulse rounded-xl bg-violet-100/60" />
            ) : (
              <DoughnutChart data={doughnutData} options={doughnutOptions} />
            )}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border p-6 shadow-sm"
        style={{ backgroundColor: SURFACE, borderColor: `${ACCENT}33` }}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">User management</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search name or email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="min-w-[200px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              type="button"
              onClick={() => {
                setModalError("");
                setModalOpen(true);
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ backgroundColor: ACCENT }}
            >
              Add user
            </button>
          </div>
        </div>

        {loading && !users.length ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-violet-100/50" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-violet-200/80 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-violet-50/90">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Joined</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-violet-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{u.full_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={userBusyId === u.id || u.id === user?.id}
                        onChange={(e) => patchUser(u.id, { role: e.target.value })}
                        className="max-w-[160px] rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs capitalize outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(u.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                          checked={u.is_active}
                          disabled={userBusyId === u.id || u.id === user?.id}
                          onChange={(e) => patchUser(u.id, { is_active: e.target.checked })}
                        />
                        <span className="text-xs text-slate-600">{u.is_active ? "Deactivate" : "Activate"}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && !loading ? (
              <p className="p-6 text-center text-sm text-slate-500">No users match your search.</p>
            ) : null}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          Recent shipments (all users)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-violet-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-violet-50/90">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Reference</th>
                <th className="px-4 py-3 font-medium text-slate-700">Owner</th>
                <th className="px-4 py-3 font-medium text-slate-700">Origin → Destination</th>
                <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 font-medium text-slate-700">Value</th>
                <th className="px-4 py-3 font-medium text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !recentShipments.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 animate-pulse rounded bg-violet-100/50" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : (
                recentShipments.map((sh) => (
                  <tr key={sh.id} className="hover:bg-violet-50/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{sh.reference}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium">{sh.owner_name || "—"}</div>
                      <div className="text-xs text-slate-500">{sh.owner_email || ""}</div>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-slate-600">
                      {(sh.origin || "—") + " → " + (sh.destination || "—")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium capitalize text-violet-900">
                        {String(sh.status).replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {sh.estimated_value != null
                        ? formatMoney(sh.estimated_value) + (sh.currency && sh.currency !== "USD" ? ` ${sh.currency}` : "")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(sh.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && recentShipments.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No shipments yet.</p>
          ) : null}
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-6 shadow-xl"
            style={{ borderColor: `${ACCENT}44` }}
          >
            <h3 id="add-user-title" className="text-lg font-semibold text-slate-900">
              Add user
            </h3>
            <p className="mt-1 text-sm text-slate-600">Create an account with a temporary password.</p>
            <form className="mt-4 space-y-3" onSubmit={submitNewUser}>
              {modalError ? (
                <p className="text-sm text-red-600" role="alert">
                  {modalError}
                </p>
              ) : null}
              <div>
                <label className="block text-xs font-medium text-slate-600">Full name</label>
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser((p) => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Email</label>
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Role</label>
                <select
                  className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-violet-400"
                  value={newUser.role}
                  onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Temporary password (min 8 chars)</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: ACCENT }}
                >
                  {creating ? "Creating…" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gradient-to-b from-violet-50/80 to-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <AdminDashboardContent />
        </div>
      </div>
    </RoleGuard>
  );
}
