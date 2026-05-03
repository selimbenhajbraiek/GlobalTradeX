"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { analyticsApi, productsApi, shipmentsApi } from "@/lib/api";

const BG = "#E1F5EE";
const ACCENT = "#0F6E56";

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
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-xl bg-white/50" /> }
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

function formatMoney(n) {
  if (n == null || n === "") return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(x);
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function shipmentStatusBadge(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    delivered: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    pending: "bg-amber-100 text-amber-900 ring-amber-200",
    in_transit: "bg-sky-100 text-sky-900 ring-sky-200",
    delayed: "bg-red-100 text-red-800 ring-red-200",
    customs_hold: "bg-violet-100 text-violet-900 ring-violet-200",
    cancelled: "bg-gray-200 text-gray-700 ring-gray-300",
  };
  return map[s] || "bg-white/80 text-gray-800 ring-gray-200";
}

const emptyProductForm = {
  name: "",
  hs_code: "",
  unit_price: "",
  quantity: "",
  origin_country: "",
};

function ExportateurDashboardInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProductForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, shipRes, analyticsRes] = await Promise.all([
        productsApi.getAll({ page: 1, limit: 500 }),
        shipmentsApi.getAll({ mine_only: true }),
        analyticsApi.shipments(),
      ]);
      const items = prodRes.data?.items ?? prodRes.data ?? [];
      setProducts(Array.isArray(items) ? items : []);
      setShipments(shipRes.data || []);
      setStats(analyticsRes.data);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recentShipments = useMemo(() => {
    return [...shipments]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [shipments]);

  const barData = useMemo(() => {
    const months = stats?.revenue_by_month || [];
    const labels = months.map((m) => {
      const [y, mo] = String(m.month).split("-");
      const d = new Date(Date.UTC(Number(y), Number(mo) - 1, 1));
      return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    });
    const data = months.map((m) => Number(m.revenue) || 0);
    return {
      labels,
      datasets: [
        {
          label: "Revenue (USD)",
          data,
          backgroundColor: ACCENT,
          borderRadius: 8,
          maxBarThickness: 40,
        },
      ],
    };
  }, [stats]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Revenue by month (estimated shipment values)",
          color: "#0f172a",
          font: { size: 14, weight: "600" },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: ACCENT },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: ACCENT,
            callback: (v) => `$${v}`,
          },
          grid: { color: "rgba(15, 110, 86, 0.08)" },
        },
      },
    }),
    []
  );

  function openAdd() {
    setEditingId(null);
    setForm(emptyProductForm);
    setFormError("");
    setShowAddForm(true);
  }

  function openEdit(p) {
    setShowAddForm(false);
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      hs_code: p.hs_code || "",
      unit_price: String(p.unit_price ?? ""),
      quantity: String(p.quantity ?? ""),
      origin_country: p.origin_country || "",
    });
    setFormError("");
  }

  function cancelForm() {
    setShowAddForm(false);
    setEditingId(null);
    setForm(emptyProductForm);
    setFormError("");
  }

  async function submitProduct(e) {
    e.preventDefault();
    setFormError("");
    const hs = form.hs_code.trim();
    if (hs.length < 6 || hs.length > 10) {
      setFormError("HS code must be between 6 and 10 characters.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        hs_code: hs,
        description: null,
        unit_price: form.unit_price === "" ? 0 : Number(form.unit_price),
        quantity: form.quantity === "" ? 0 : parseInt(form.quantity, 10),
        unit: "pcs",
        origin_country: form.origin_country.trim(),
      };
      if (editingId != null) {
        await productsApi.update(editingId, payload);
      } else {
        await productsApi.create(payload);
      }
      cancelForm();
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id) {
    if (!window.confirm("Delete this product?")) return;
    setError(null);
    try {
      await productsApi.remove(id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const kpis = [
    { label: "Total Products", value: stats?.total_products ?? "—" },
    { label: "Active Shipments", value: stats?.active_shipments ?? "—" },
    { label: "Delivered This Month", value: stats?.delivered_this_month ?? "—" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold" style={{ color: ACCENT }}>
            Exporter workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Manage your catalog, monitor shipments, and track revenue trends.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{ backgroundColor: ACCENT }}
        >
          Add Product
        </button>
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

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-white/80 px-5 py-4 shadow-sm"
            style={{ backgroundColor: BG }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90" style={{ color: ACCENT }}>
              {k.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/80 p-4 shadow-sm sm:p-6" style={{ backgroundColor: BG }}>
        <div className="h-64 w-full">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          My Products
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 font-medium text-gray-700">HS Code</th>
                <th className="px-4 py-3 font-medium text-gray-700">Unit Price</th>
                <th className="px-4 py-3 font-medium text-gray-700">Stock Quantity</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{p.hs_code}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatMoney(p.unit_price)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{p.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-50"
                        style={{ borderColor: ACCENT, color: ACCENT }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">No products yet.</p>
          ) : null}
        </div>

        {(showAddForm || editingId != null) && (
          <form
            onSubmit={submitProduct}
            className="mt-6 space-y-4 rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-inner"
          >
            <h3 className="text-base font-semibold text-slate-900">
              {editingId != null ? "Edit product" : "New product"}
            </h3>
            {formError ? (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600">Name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">HS code (6–10 chars)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                  value={form.hs_code}
                  onChange={(e) => setForm((f) => ({ ...f, hs_code: e.target.value }))}
                  minLength={6}
                  maxLength={10}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Unit price (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                  value={form.unit_price}
                  onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Origin country</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                  value={form.origin_country}
                  onChange={(e) => setForm((f) => ({ ...f, origin_country: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {saving ? "Saving…" : editingId != null ? "Save changes" : "Create product"}
              </button>
              <button type="button" onClick={cancelForm} className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          Recent Shipments
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Reference</th>
                <th className="px-4 py-3 font-medium text-gray-700">Destination</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Estimated Value</th>
                <th className="px-4 py-3 font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentShipments.map((sh) => (
                <tr key={sh.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{sh.reference}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-600" title={sh.destination}>
                    {sh.destination || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${shipmentStatusBadge(
                        sh.status
                      )}`}
                    >
                      {String(sh.status).replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatMoney(sh.estimated_value)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(sh.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentShipments.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">No shipments yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ExportateurPage() {
  return (
    <RoleGuard allowedRoles={["exportateur", "admin"]}>
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-green-50/40 to-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <ExportateurDashboardInner />
        </div>
      </div>
    </RoleGuard>
  );
}
