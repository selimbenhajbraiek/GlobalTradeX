"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { analyticsApi, shipmentsApi } from "@/lib/api";

const BG = "#FAEEDA";
const ACCENT = "#BA7517";

/** Mirrors backend `_ALLOWED_STATUS_TRANSITIONS` for dropdown options. */
const NEXT_STATUSES = {
  pending: ["in_transit"],
  in_transit: ["customs_hold", "delivered", "delayed"],
  customs_hold: ["in_transit", "delivered"],
  delayed: ["in_transit"],
};

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function formatStatus(s) {
  return String(s || "").replace(/_/g, " ");
}

function statusBadgeClass(status) {
  const x = String(status || "").toLowerCase();
  const map = {
    delivered: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    pending: "bg-amber-100 text-amber-900 ring-amber-200",
    in_transit: "bg-sky-100 text-sky-900 ring-sky-200",
    delayed: "bg-red-100 text-red-800 ring-red-200",
    customs_hold: "bg-violet-100 text-violet-900 ring-violet-200",
    cancelled: "bg-gray-200 text-gray-700 ring-gray-300",
  };
  return map[x] || "bg-white/90 text-gray-800 ring-gray-200";
}

function TransitaireDashboardInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeRows, setActiveRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [openUpdateId, setOpenUpdateId] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, inTransitRes, pendingRes] = await Promise.all([
        analyticsApi.shipments(),
        shipmentsApi.getAll({ status: "in_transit" }),
        shipmentsApi.getAll({ status: "pending" }),
      ]);
      setStats(analyticsRes.data);
      setActiveRows(inTransitRes.data || []);
      setPendingRows(pendingRes.data || []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(
    () => [
      { label: "Active Shipments", value: stats?.active_shipments ?? "—" },
      { label: "Pending Pickup", value: stats?.pending ?? "—" },
      { label: "Delayed", value: stats?.delayed ?? "—" },
    ],
    [stats]
  );

  const delayedCount = Number(stats?.delayed ?? 0);

  function openUpdate(sh) {
    setRowError("");
    setOpenUpdateId(sh.id);
    const next = NEXT_STATUSES[sh.status] || [];
    setDraftStatus(next[0] || "");
    setDraftNotes("");
  }

  function closeUpdate() {
    setOpenUpdateId(null);
    setDraftStatus("");
    setDraftNotes("");
    setRowError("");
  }

  async function confirmUpdate(sh) {
    setRowError("");
    if (!draftStatus) {
      setRowError("Select a status.");
      return;
    }
    setSavingId(sh.id);
    try {
      await shipmentsApi.updateStatus(sh.id, {
        new_status: draftStatus,
        notes: draftNotes.trim() || undefined,
      });
      closeUpdate();
      await load();
    } catch (e) {
      setRowError(apiErrorMessage(e));
    } finally {
      setSavingId(null);
    }
  }

  const optionsFor = (current) => NEXT_STATUSES[String(current)] || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold" style={{ color: ACCENT }}>
          Freight forwarder
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-700">
          Manage in-transit cargo, pickups, and status updates. Financial analytics are not shown here.
        </p>
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

      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        role="status"
      >
        <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
          {delayedCount}
        </span>
        <span>
          Delayed shipments require attention — review routes and update status when issues are cleared.
        </span>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          Active Shipments
        </h2>
        <p className="mb-3 text-sm text-gray-600">Shipments currently in transit (workflow queue).</p>
        <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-amber-50/80">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Reference</th>
                <th className="px-4 py-3 font-medium text-gray-700">Origin</th>
                <th className="px-4 py-3 font-medium text-gray-700">Destination</th>
                <th className="px-4 py-3 font-medium text-gray-700">Current Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Weight</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeRows.map((sh) => (
                <Fragment key={sh.id}>
                  <tr className="hover:bg-amber-50/50">
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
                        {formatStatus(sh.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {sh.weight_kg != null ? `${sh.weight_kg} kg` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openUpdate(sh)}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-white shadow-sm hover:opacity-95"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                  {openUpdateId === sh.id ? (
                    <tr key={`${sh.id}-edit`} className="bg-[#FAEEDA]/60">
                      <td colSpan={6} className="px-4 py-4">
                        {rowError ? (
                          <p className="mb-3 text-sm text-red-600" role="alert">
                            {rowError}
                          </p>
                        ) : null}
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">New status</label>
                            <select
                              className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftStatus}
                              onChange={(e) => setDraftStatus(e.target.value)}
                            >
                              {optionsFor(sh.status).map((opt) => (
                                <option key={opt} value={opt}>
                                  {formatStatus(opt)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-[200px] flex-1">
                            <label className="block text-xs font-medium text-gray-600">Notes (optional)</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftNotes}
                              onChange={(e) => setDraftNotes(e.target.value)}
                              placeholder="e.g. Customs cleared"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={savingId === sh.id}
                              onClick={() => confirmUpdate(sh)}
                              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              style={{ backgroundColor: ACCENT }}
                            >
                              {savingId === sh.id ? "Saving…" : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={closeUpdate}
                              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          {activeRows.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">No in-transit shipments.</p>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          Pending Pickup
        </h2>
        <p className="mb-3 text-sm text-gray-600">Awaiting first mile / pickup.</p>
        <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-amber-50/80">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Reference</th>
                <th className="px-4 py-3 font-medium text-gray-700">Origin</th>
                <th className="px-4 py-3 font-medium text-gray-700">Destination</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingRows.map((sh) => (
                <Fragment key={sh.id}>
                  <tr className="hover:bg-amber-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{sh.reference}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-gray-600">{sh.origin || "—"}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-gray-600">{sh.destination || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusBadgeClass(
                          sh.status
                        )}`}
                      >
                        {formatStatus(sh.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openUpdate(sh)}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-white shadow-sm hover:opacity-95"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                  {openUpdateId === sh.id ? (
                    <tr key={`${sh.id}-edit-p`} className="bg-[#FAEEDA]/60">
                      <td colSpan={5} className="px-4 py-4">
                        {rowError ? (
                          <p className="mb-3 text-sm text-red-600" role="alert">
                            {rowError}
                          </p>
                        ) : null}
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">New status</label>
                            <select
                              className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftStatus}
                              onChange={(e) => setDraftStatus(e.target.value)}
                            >
                              {optionsFor(sh.status).map((opt) => (
                                <option key={opt} value={opt}>
                                  {formatStatus(opt)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-[200px] flex-1">
                            <label className="block text-xs font-medium text-gray-600">Notes (optional)</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftNotes}
                              onChange={(e) => setDraftNotes(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={savingId === sh.id}
                              onClick={() => confirmUpdate(sh)}
                              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              style={{ backgroundColor: ACCENT }}
                            >
                              {savingId === sh.id ? "Saving…" : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={closeUpdate}
                              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          {pendingRows.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">No pending pickups.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TransitairePage() {
  return (
    <RoleGuard allowedRoles={["transitaire", "admin"]}>
      <TransitaireDashboardInner />
    </RoleGuard>
  );
}
