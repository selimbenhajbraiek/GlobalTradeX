"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { documentsApi, shipmentsApi } from "@/lib/api";

const TRADE_TYPES = [
  { value: "commercial_invoice", label: "Commercial Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "certificate_of_origin", label: "Certificate of Origin" },
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "customs_declaration", label: "Customs Declaration" },
  { value: "other", label: "Other" },
];

const MAX_BYTES = 10 * 1024 * 1024;

function normalizeRole(role) {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "value" in role) return String(role.value);
  return "";
}

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function tradeLabel(value) {
  return TRADE_TYPES.find((t) => t.value === value)?.label || String(value || "Document").replace(/_/g, " ");
}

function fileExt(name) {
  const parts = (name || "").split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
}

function docStatus(doc) {
  if (doc.is_verified) return "verified";
  if (doc.ai_result && !doc.is_verified) return "review";
  const uploaded = doc.uploaded_at ? new Date(doc.uploaded_at).getTime() : 0;
  const recent = Date.now() - uploaded < 5 * 60 * 1000;
  if (!doc.ai_result && recent) return "processing";
  if (!doc.is_verified) return "review";
  return "processing";
}

function StatusBadge({ status }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
        <Check className="h-3 w-3" aria-hidden />
        Verified
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-kinetic/30 bg-kinetic/10 px-2.5 py-0.5 text-[11px] font-medium text-kinetic">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning/15 px-2.5 py-0.5 text-[11px] font-medium text-warning">
      Needs review
    </span>
  );
}

export function DocumentsWorkspacePage() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isCourtier = role === "courtier";

  const [shipments, setShipments] = useState([]);
  const [shipmentId, setShipmentId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [file, setFile] = useState(null);
  const [tradeType, setTradeType] = useState("bill_of_lading");
  const [uploadPct, setUploadPct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const shipmentRefMap = useMemo(() => {
    const m = new Map();
    for (const s of shipments) m.set(s.id, s.reference);
    return m;
  }, [shipments]);

  const loadShipments = useCallback(async () => {
    try {
      const { data } = await shipmentsApi.getAll(
        role === "admin" ? {} : { mine_only: role === "importateur" || role === "exportateur" }
      );
      const list = Array.isArray(data) ? data : [];
      setShipments(list);
      setShipmentId((prev) => (prev && list.some((s) => String(s.id) === prev) ? prev : list[0] ? String(list[0].id) : ""));
    } catch {
      setShipments([]);
    }
  }, [role]);

  const loadDocs = useCallback(async () => {
    setError("");
    try {
      const { data } = await documentsApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(apiErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShipments();
    loadDocs();
  }, [loadShipments, loadDocs]);

  const processingDocs = useMemo(
    () => rows.filter((d) => docStatus(d) === "processing"),
    [rows]
  );

  const processingCount = processingDocs.length;

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (processingCount > 0) {
      pollRef.current = setInterval(loadDocs, 4000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [processingCount, loadDocs]);

  const aiProgress = useMemo(() => {
    if (uploading && uploadPct != null) return uploadPct;
    if (processingCount === 0) return 0;
    return Math.min(95, 40 + processingCount * 18);
  }, [uploading, uploadPct, processingCount]);

  function onFileChosen(f) {
    if (!f) return;
    const lower = (f.name || "").toLowerCase();
    const ok =
      lower.endsWith(".pdf") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg");
    if (!ok) {
      setError("Only PDF, PNG, JPG, and JPEG files are allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File is too large (max 10 MB).");
      return;
    }
    setError("");
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    onFileChosen(e.dataTransfer?.files?.[0]);
  }

  async function onUpload() {
    if (!shipmentId || !file) {
      setError("Select a shipment before uploading.");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    setError("");
    setToast("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("shipment_id", shipmentId);
      fd.append("file_type", tradeType);
      await documentsApi.upload(fd, (pct) => setUploadPct(pct));
      setToast("Document uploaded — AI OCR started.");
      setFile(null);
      setUploadPct(null);
      await loadDocs();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  }

  async function onAiVerify(docId) {
    setBusyId(docId);
    try {
      await documentsApi.aiVerify(docId);
      setToast("Analyse IA terminée.");
      await loadDocs();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onApproveDoc(docId, name) {
    setBusyId(docId);
    setError("");
    try {
      await documentsApi.verify(docId, { is_verified: true });
      setToast(`Document « ${name} » approuvé.`);
      await loadDocs();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onRejectDoc(docId, name) {
    const reason = window.prompt("Motif de refus :", "");
    if (reason == null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Indiquez un motif de refus.");
      return;
    }
    setBusyId(docId);
    setError("");
    try {
      await documentsApi.verify(docId, { is_verified: false, rejection_reason: trimmed });
      setToast(`Document « ${name} » refusé.`);
      await loadDocs();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()
      ),
    [rows]
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Workspace</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground md:text-[2.75rem]">
          Documents
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Drag, drop, sign, file. Every document OCR&apos;d and tagged in seconds.
        </p>
      </header>

      {toast ? (
        <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload column */}
        <div className="flex flex-col rounded-xl border border-border bg-card shadow-paper">
          <div
            className={`m-4 flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background px-6 py-10 text-center transition-colors ${
              shipmentId ? "cursor-pointer hover:border-kinetic/40 hover:bg-accent/30" : "opacity-60"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={shipmentId ? onDrop : undefined}
            onClick={() => shipmentId && inputRef.current?.click()}
            role="presentation"
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              disabled={!shipmentId || uploading}
              onChange={(e) => onFileChosen(e.target.files?.[0])}
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/50">
              <Upload className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            </span>
            {file ? (
              <div className="mt-4 text-sm">
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="mt-1 text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            ) : (
              <>
                <p className="mt-4 text-sm font-medium text-foreground">Drop documents here</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG · up to 10 MB</p>
              </>
            )}
            <button
              type="button"
              className="btn-primary mt-5"
              disabled={!shipmentId || uploading}
              onClick={(e) => {
                e.stopPropagation();
                if (file) onUpload();
                else inputRef.current?.click();
              }}
            >
              {uploading ? "Uploading…" : file ? "Upload file" : "Browse files"}
            </button>
          </div>

          <div className="border-t border-border px-4 py-4">
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Shipment</label>
                <select
                  className="input-field mt-1 text-xs"
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  disabled={uploading || shipments.length === 0}
                >
                  {shipments.length === 0 ? (
                    <option value="">No shipments</option>
                  ) : (
                    shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.reference}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Document type</label>
                <select
                  className="input-field mt-1 text-xs"
                  value={tradeType}
                  onChange={(e) => setTradeType(e.target.value)}
                  disabled={uploading}
                >
                  {TRADE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="eyebrow flex items-center gap-1.5 !text-[10px] text-kinetic">
              <Sparkles className="h-3 w-3" aria-hidden />
              AI processing
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {processingCount > 0
                ? `${processingCount} document${processingCount > 1 ? "s" : ""} being OCR'd · ETA ~${Math.max(8, 12 * processingCount)}s`
                : uploading
                  ? "Uploading & queuing OCR…"
                  : "Idle — upload to start OCR and classification"}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gradient-kinetic transition-all duration-500"
                style={{ width: `${aiProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent documents */}
        <div className="rounded-xl border border-border bg-card shadow-paper">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-xl text-foreground">Recent</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {rows.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner className="h-7 w-7 border-2 border-kinetic/30 border-t-kinetic" />
            </div>
          ) : sortedRows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              No documents yet. Upload a bill of lading, invoice, or customs form to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sortedRows.map((doc) => {
                const ref = shipmentRefMap.get(doc.shipment_id) || "—";
                const status = docStatus(doc);
                const title = `${tradeLabel(doc.file_type)} · ${ref}`;

                return (
                  <li
                    key={doc.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                      <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {fileExt(doc.original_name)} · {formatBytes(doc.file_size)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge status={status} />
                      {isCourtier && status !== "verified" ? (
                        <div className="flex flex-col items-end gap-1">
                          {!doc.ai_result ? (
                            <button
                              type="button"
                              className="text-[10px] font-medium text-kinetic hover:underline disabled:opacity-50"
                              disabled={busyId === doc.id}
                              onClick={() => onAiVerify(doc.id)}
                            >
                              Lancer l&apos;analyse IA
                            </button>
                          ) : null}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="text-[10px] font-medium text-success hover:underline disabled:opacity-50"
                              disabled={busyId === doc.id}
                              onClick={() => onApproveDoc(doc.id, doc.original_name)}
                            >
                              Approuver
                            </button>
                            <button
                              type="button"
                              className="text-[10px] font-medium text-destructive hover:underline disabled:opacity-50"
                              disabled={busyId === doc.id}
                              onClick={() => onRejectDoc(doc.id, doc.original_name)}
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
