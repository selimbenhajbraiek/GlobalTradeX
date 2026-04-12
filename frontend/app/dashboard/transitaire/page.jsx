"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, X } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import { analyticsApi, documentsApi, shipmentsApi } from "@/lib/api";

const BG = "#FAEEDA";
const ACCENT = "#BA7517";

/** Mirrors backend `_ALLOWED_STATUS_TRANSITIONS`. */
const NEXT_STATUSES = {
  pending: ["in_transit"],
  in_transit: ["customs_hold", "delivered", "delayed"],
  customs_hold: ["in_transit", "delivered"],
  delayed: ["in_transit", "cancelled"],
};

const TRADE_TYPES = [
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "commercial_invoice", label: "Commercial Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "certificate_of_origin", label: "Certificate of Origin" },
  { value: "customs_declaration", label: "Customs Declaration" },
  { value: "other", label: "Other" },
];

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

function toDateInputValue(v) {
  if (!v) return "";
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function formatEtaDisplay(sh) {
  const raw = sh?.eta_update ?? sh?.arrival_date;
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
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
  const [allShipments, setAllShipments] = useState([]);
  const [tab, setTab] = useState("active");
  const [openUpdateId, setOpenUpdateId] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftVessel, setDraftVessel] = useState("");
  const [draftVoyage, setDraftVoyage] = useState("");
  const [draftEta, setDraftEta] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [rowError, setRowError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadShipment, setUploadShipment] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState("bill_of_lading");
  const [uploadPct, setUploadPct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, shipRes] = await Promise.all([analyticsApi.shipments(), shipmentsApi.getAll()]);
      setStats(analyticsRes.data);
      setAllShipments(Array.isArray(shipRes.data) ? shipRes.data : []);
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
    if (!toast) return undefined;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const activeRows = useMemo(
    () => allShipments.filter((s) => !["delivered", "cancelled"].includes(String(s.status))),
    [allShipments]
  );

  const completedRows = useMemo(
    () => allShipments.filter((s) => ["delivered", "cancelled"].includes(String(s.status))),
    [allShipments]
  );

  const kpis = useMemo(
    () => [
      { label: "Active (in transit)", value: stats?.in_transit ?? "—" },
      { label: "Pending pickup", value: stats?.pending ?? "—" },
      { label: "Delayed", value: stats?.delayed ?? "—" },
      { label: "Delivered today", value: stats?.delivered_today ?? "—" },
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
    setDraftVessel(sh.vessel_name || "");
    setDraftVoyage(sh.voyage_number || "");
    setDraftEta(toDateInputValue(sh.eta_update || sh.arrival_date));
  }

  function closeUpdate() {
    setOpenUpdateId(null);
    setDraftStatus("");
    setDraftNotes("");
    setDraftVessel("");
    setDraftVoyage("");
    setDraftEta("");
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
      const body = {
        new_status: draftStatus,
        notes: draftNotes.trim() || undefined,
        vessel_name: draftVessel.trim() || undefined,
        voyage_number: draftVoyage.trim() || undefined,
      };
      if (draftEta) body.eta_update = draftEta;
      await shipmentsApi.updateStatus(sh.id, body);
      closeUpdate();
      setToast("Status updated successfully.");
      await load();
    } catch (e) {
      setRowError(apiErrorMessage(e));
    } finally {
      setSavingId(null);
    }
  }

  function openUpload(sh) {
    setUploadShipment(sh);
    setUploadFile(null);
    setUploadType("bill_of_lading");
    setUploadPct(null);
    setUploadError("");
    setUploadOpen(true);
  }

  function closeUpload() {
    setUploadOpen(false);
    setUploadShipment(null);
    setUploadFile(null);
    setUploading(false);
    setUploadPct(null);
    setUploadError("");
  }

  async function submitUpload() {
    if (!uploadShipment?.id || !uploadFile) return;
    setUploading(true);
    setUploadPct(0);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("shipment_id", String(uploadShipment.id));
      fd.append("file_type", uploadType);
      await documentsApi.upload(fd, (pct) => setUploadPct(pct));
      setToast("Document uploaded successfully.");
      closeUpload();
    } catch (e) {
      setUploadError(apiErrorMessage(e));
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  }

  function onPickFile(f) {
    if (!f) return;
    const name = (f.name || "").toLowerCase();
    const ok =
      name.endsWith(".pdf") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");
    if (!ok) {
      setUploadError("Only PDF, PNG, JPG, and JPEG files are allowed.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setUploadError("File is too large (max 10 MB).");
      return;
    }
    setUploadError("");
    setUploadFile(f);
  }

  const optionsFor = (current) => NEXT_STATUSES[String(current)] || [];

  const tableRows = tab === "active" ? activeRows : completedRows;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold" style={{ color: ACCENT }}>
          Freight forwarder
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-700">
          Bookings, port milestones, and Bill of Lading — update statuses and keep importers and exporters
          informed.
        </p>
      </div>

      {toast ? (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-xl border border-amber-300 bg-[#FFF8E7] px-4 py-3 text-sm font-medium text-amber-950 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {delayedCount > 0 ? (
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
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-amber-200/80 pb-1">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "active" ? "bg-white text-amber-900 shadow-sm ring-1 ring-amber-200" : "text-gray-600 hover:text-amber-900"
          }`}
        >
          Active shipments
        </button>
        <button
          type="button"
          onClick={() => setTab("completed")}
          className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "completed" ? "bg-white text-amber-900 shadow-sm ring-1 ring-amber-200" : "text-gray-600 hover:text-amber-900"
          }`}
        >
          Completed shipments
        </button>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          {tab === "active" ? "Active shipments" : "Completed shipments"}
        </h2>
        <p className="mb-3 text-sm text-gray-600">
          {tab === "active"
            ? "Workflow queue — expand a row to update status or upload trade documents."
            : "Delivered or cancelled — read-only history."}
        </p>
        <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-amber-50/80">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Reference</th>
                <th className="px-4 py-3 font-medium text-gray-700">Origin → Destination</th>
                <th className="px-4 py-3 font-medium text-gray-700">Current status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Weight</th>
                <th className="px-4 py-3 font-medium text-gray-700">ETA</th>
                {tab === "active" ? (
                  <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((sh) => (
                <Fragment key={sh.id}>
                  <tr className="hover:bg-amber-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{sh.reference}</td>
                    <td className="max-w-[220px] px-4 py-3 text-gray-600" title={`${sh.origin} → ${sh.destination}`}>
                      <span className="line-clamp-2">
                        {(sh.origin || "—") + " → " + (sh.destination || "—")}
                      </span>
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
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatEtaDisplay(sh)}</td>
                    {tab === "active" ? (
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openUpdate(sh)}
                            className="rounded-lg px-3 py-1 text-xs font-medium text-white shadow-sm hover:opacity-95"
                            style={{ backgroundColor: ACCENT }}
                          >
                            Update status
                          </button>
                          <button
                            type="button"
                            onClick={() => openUpload(sh)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                            Upload document
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                  {tab === "active" && openUpdateId === sh.id ? (
                    <tr key={`${sh.id}-edit`} className="bg-[#FAEEDA]/60">
                      <td colSpan={6} className="px-4 py-4">
                        {rowError ? (
                          <p className="mb-3 text-sm text-red-600" role="alert">
                            {rowError}
                          </p>
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">New status</label>
                            <select
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftStatus}
                              onChange={(e) => setDraftStatus(e.target.value)}
                              disabled={optionsFor(sh.status).length === 0}
                            >
                              {optionsFor(sh.status).length === 0 ? (
                                <option value="">No transitions available</option>
                              ) : (
                                optionsFor(sh.status).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {formatStatus(opt)}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-2">
                            <label className="block text-xs font-medium text-gray-600">Notes</label>
                            <textarea
                              rows={2}
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftNotes}
                              onChange={(e) => setDraftNotes(e.target.value)}
                              placeholder="Vessel departed port of Sfax on time"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Vessel name (optional)</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftVessel}
                              onChange={(e) => setDraftVessel(e.target.value)}
                              placeholder="e.g. Tunis Star"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Voyage number (optional)</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftVoyage}
                              onChange={(e) => setDraftVoyage(e.target.value)}
                              placeholder="Tracking / voyage ID"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">ETA update (optional)</label>
                            <input
                              type="date"
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                              value={draftEta}
                              onChange={(e) => setDraftEta(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
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
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          {tableRows.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">
              {tab === "active" ? "No active shipments." : "No completed shipments yet."}
            </p>
          ) : null}
        </div>
      </div>

      {uploadOpen && uploadShipment ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-amber-200 bg-[#FFFDF8] p-6 shadow-xl"
            style={{ backgroundColor: BG }}
          >
            <button
              type="button"
              onClick={closeUpload}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-600 hover:bg-white/80"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 id="upload-modal-title" className="pr-10 text-lg font-semibold" style={{ color: ACCENT }}>
              Upload document — {uploadShipment.reference}
            </h3>
            <p className="mt-1 text-sm text-gray-600">Attach a Bill of Lading or other trade file (max 10 MB).</p>
            {uploadError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {uploadError}
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Document type</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                >
                  {TRADE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">File</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </div>
              {uploadPct != null ? (
                <p className="text-xs text-gray-600">
                  Uploading… {uploadPct}%
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeUpload}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading || !uploadFile}
                onClick={submitUpload}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TransitairePage() {
  return (
    <RoleGuard allowedRoles={["transitaire", "admin"]}>
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${BG} 0%, #fff 32%)` }}>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <TransitaireDashboardInner />
        </div>
      </div>
    </RoleGuard>
  );
}
