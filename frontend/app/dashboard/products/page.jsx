"use client";

import { HelpCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { productsApi } from "@/lib/api";

const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "liter", label: "liter" },
  { value: "pcs", label: "pcs" },
  { value: "box", label: "box" },
];

const emptyForm = {
  name: "",
  hs_code: "",
  description: "",
  unit_price: "",
  quantity: "",
  unit: "kg",
  origin_country: "",
};

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  if (Array.isArray(d?.error?.errors)) {
    return d.error.errors.map((e) => e?.msg || JSON.stringify(e)).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function formatMoney(n) {
  if (n == null || n === "") return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(x);
}

function ProductsPageInner() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await productsApi.getAll({
        search: search.trim() || undefined,
        page,
        limit,
      });
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e) {
      setError(apiErrorMessage(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      hs_code: p.hs_code || "",
      description: p.description ?? "",
      unit_price: String(p.unit_price ?? ""),
      quantity: String(p.quantity ?? ""),
      unit: p.unit || "kg",
      origin_country: p.origin_country || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function onSubmit(e) {
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
        description: form.description.trim() ? form.description.trim() : null,
        unit_price: form.unit_price === "" ? 0 : Number(form.unit_price),
        quantity: form.quantity === "" ? 0 : parseInt(form.quantity, 10),
        unit: form.unit,
        origin_country: form.origin_country.trim(),
      };
      if (editingId != null) {
        await productsApi.update(editingId, payload);
        showToast("Product updated successfully.");
      } else {
        await productsApi.create(payload);
        showToast("Product created successfully.");
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setError("");
    try {
      await productsApi.remove(id);
      showToast("Product deleted.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-900 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div
        className="rounded-2xl border-2 border-green-500 bg-green-50 p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-900">My Products</h1>
            <p className="mt-2 text-sm text-slate-700">
              Register and manage your export catalog. HS codes are reused for duties and customs.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-green-600 bg-white px-5 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition hover:bg-green-100"
          >
            Add Product
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md flex-1">
            <label htmlFor="product-search" className="text-xs font-medium text-slate-700">
              Search
            </label>
            <input
              id="product-search"
              className="mt-1 w-full rounded-lg border border-green-500/60 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-green-500/20 focus:ring-2"
              placeholder="Name, HS code, origin…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-600">
            {total} product{total === 1 ? "" : "s"}
            {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
          </p>
        </div>

        {formOpen ? (
          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-4 rounded-xl border border-dashed border-green-500 bg-white p-6 shadow-inner"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId != null ? "Edit product" : "New product"}
            </h2>
            {formError ? (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-700">Name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                  HS code
                  <span
                    className="inline-flex cursor-help text-green-700"
                    title="International trade classification code"
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={form.hs_code}
                  onChange={(e) => setForm((f) => ({ ...f, hs_code: e.target.value }))}
                  minLength={6}
                  maxLength={10}
                  required
                  aria-describedby="hs-code-hint"
                />
                <span id="hs-code-hint" className="sr-only">
                  International trade classification code
                </span>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-slate-700">Description (optional)</label>
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Unit price (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={form.unit_price}
                  onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Unit</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Origin country</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
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
                className="rounded-xl bg-green-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : editingId != null ? "Save changes" : "Create product"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-8 flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="mt-8 overflow-x-auto rounded-xl border border-green-500 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-green-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-800">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">HS Code</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">Quantity</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">Unit</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">Origin</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-green-50/40">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{p.hs_code}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatMoney(p.unit_price)}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">{p.quantity}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{p.unit}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{p.origin_country || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="rounded-lg border border-green-600 bg-white px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(p.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-600">No products yet. Add your first product above.</p>
              ) : null}
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-green-500 bg-white px-4 py-2 text-sm font-medium text-green-900 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-green-500 bg-white px-4 py-2 text-sm font-medium text-green-900 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RoleGuard allowedRoles={["exportateur", "admin"]}>
      <ProductsPageInner />
    </RoleGuard>
  );
}
