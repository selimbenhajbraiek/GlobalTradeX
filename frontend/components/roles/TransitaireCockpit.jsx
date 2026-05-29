"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, FileText, Ship, X } from "lucide-react";

import { PredictiveBiPanel } from "@/components/analytics/PredictiveBiPanel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { analyticsApi, documentsApi, shipmentsApi } from "@/lib/api";

import { RoleKpiCard } from "./RoleKpiCard";

const SPARK = [3, 4, 5, 4, 6];

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
    delivered: "bg-success/10 text-success ring-success/20",
    pending: "bg-muted text-muted-foreground ring-border",
    in_transit: "bg-kinetic/10 text-kinetic ring-kinetic/20",
    delayed: "bg-destructive/10 text-destructive ring-destructive/20",
    customs_hold: "bg-violet-500/10 text-violet-700 ring-violet-500/20",
    cancelled: "bg-muted text-muted-foreground ring-border",
  };
  return map[x] || "bg-muted text-foreground ring-border";
}

export function TransitaireCockpit() {
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
      const [analyticsRes, shipRes] = await Promise.all([
        analyticsApi.shipments(),
        shipmentsApi.getAll(),
      ]);
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Role · Forwarder</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Freight cockpit</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Bookings, port milestones, and Bill of Lading — update statuses and keep importers and exporters
          informed.
        </p>
      </header>

      <section className="rounded-xl border border-kinetic/20 bg-card p-4 shadow-paper md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Aperçu BI prédictif</p>
          <Link href="/dashboard/transitaire/predictive" className="text-xs font-medium text-kinetic hover:underline">
            Voir l&apos;analyse complète →
          </Link>
        </div>
        <PredictiveBiPanel compact />
      </section>

      {toast ? (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-paper"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoleKpiCard
          label="In transit"
          value={stats?.in_transit ?? "—"}
          delta="Live"
          up
          icon={Ship}
          series={SPARK}
        />
        <RoleKpiCard
          label="Pending pickup"
          value={stats?.pending ?? "—"}
          delta="Queue"
          up={false}
          icon={Clock}
          series={SPARK}
        />
        <RoleKpiCard
          label="Delayed"
          value={stats?.delayed ?? "—"}
          delta={delayedCount > 0 ? "Attention" : "Clear"}
          up={delayedCount === 0}
          icon={AlertTriangle}
          series={SPARK}
          positiveIsGood={false}
        />
        <RoleKpiCard
          label="Delivered today"
          value={stats?.delivered_today ?? "—"}
          delta="Today"
          up
          icon={CheckCircle}
          series={SPARK}
        />
      </div>

      {delayedCount > 0 ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="status"
        >
          <span className="inline-flex items-center justify-center rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
            {delayedCount}
          </span>
          <span>
            Delayed shipments require attention — review routes and update status when issues are cleared.
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {[
          ["active", "Active shipments"],
          ["completed", "Completed shipments"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section>
        <p className="eyebrow !text-[10px]">{tab === "active" ? "Workflow queue" : "History"}</p>
        <h2 className="mt-1 font-display text-xl text-foreground">
          {tab === "active" ? "Active shipments" : "Completed shipments"}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          {tab === "active"
            ? "Expand a row to update status or upload trade documents."
            : "Delivered or cancelled — read-only history."}
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-paper">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-mono text-[10px] uppercase text-muted-foreground">Reference</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase text-muted-foreground">Route</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase text-muted-foreground">Weight</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase text-muted-foreground">ETA</th>
                {tab === "active" ? (
                  <th className="px-4 py-3 font-mono text-[10px] uppercase text-muted-foreground">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableRows.map((sh) => (
                <Fragment key={sh.id}>
                  <tr className="hover:bg-accent/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{sh.reference}</td>
                    <td className="max-w-[220px] px-4 py-3 text-muted-foreground" title={`${sh.origin} → ${sh.destination}`}>
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
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">
                      {sh.weight_kg != null ? `${sh.weight_kg} kg` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatEtaDisplay(sh)}</td>
                    {tab === "active" ? (
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openUpdate(sh)} className="btn-primary px-3 py-1 text-xs">
                            Update status
                          </button>
                          <button
                            type="button"
                            onClick={() => openUpload(sh)}
                            className="btn-secondary inline-flex items-center gap-1 px-3 py-1 text-xs"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                            Upload
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                  {tab === "active" && openUpdateId === sh.id ? (
                    <tr key={`${sh.id}-edit`} className="bg-accent/30">
                      <td colSpan={6} className="px-4 py-4">
                        {rowError ? (
                          <p className="mb-3 text-sm text-destructive" role="alert">
                            {rowError}
                          </p>
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <label className="font-mono text-[10px] uppercase text-muted-foreground">New status</label>
                            <select
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            <label className="font-mono text-[10px] uppercase text-muted-foreground">Notes</label>
                            <textarea
                              rows={2}
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={draftNotes}
                              onChange={(e) => setDraftNotes(e.target.value)}
                              placeholder="Vessel departed port on time"
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[10px] uppercase text-muted-foreground">Vessel (optional)</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={draftVessel}
                              onChange={(e) => setDraftVessel(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[10px] uppercase text-muted-foreground">Voyage (optional)</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={draftVoyage}
                              onChange={(e) => setDraftVoyage(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[10px] uppercase text-muted-foreground">ETA update</label>
                            <input
                              type="date"
                              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            className="btn-primary disabled:opacity-60"
                          >
                            {savingId === sh.id ? "Saving…" : "Confirm"}
                          </button>
                          <button type="button" onClick={closeUpdate} className="btn-secondary">
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
          {tableRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {tab === "active" ? "No active shipments." : "No completed shipments yet."}
            </p>
          ) : null}
        </div>
      </section>

      {uploadOpen && uploadShipment ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-paper">
            <button
              type="button"
              onClick={closeUpload}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 id="upload-modal-title" className="pr-10 font-display text-xl text-foreground">
              Upload document — {uploadShipment.reference}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Bill of Lading or trade file (max 10 MB).</p>
            {uploadError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground">Document type</label>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
                <label className="font-mono text-[10px] uppercase text-muted-foreground">File</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </div>
              {uploadPct != null ? (
                <p className="text-xs text-muted-foreground">Uploading… {uploadPct}%</p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeUpload} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading || !uploadFile}
                onClick={submitUpload}
                className="btn-primary disabled:opacity-50"
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
