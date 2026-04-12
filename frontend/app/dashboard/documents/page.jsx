"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, FileText, Loader2, Trash2, Download, Sparkles } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
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
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function tradeLabel(value) {
  return TRADE_TYPES.find((t) => t.value === value)?.label || value || "—";
}

function isImageFile(file) {
  return file && file.type.startsWith("image/");
}

function DocumentsPageInner() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isCourtier = role === "courtier";
  const isExporterTheme = role === "exportateur";

  const [shipments, setShipments] = useState([]);
  const [shipmentId, setShipmentId] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tradeType, setTradeType] = useState("commercial_invoice");
  const [uploadPct, setUploadPct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");

  const [busyId, setBusyId] = useState(null);

  const inputRef = useRef(null);
  const shellClass = isExporterTheme
    ? "rounded-2xl border-2 border-green-500 bg-green-50 p-6 shadow-sm"
    : "glass rounded-2xl p-6 shadow-lift";

  const loadShipments = useCallback(async () => {
    setLoadingShipments(true);
    setError("");
    try {
      const { data } = await shipmentsApi.getAll(
        role === "admin" ? {} : { mine_only: role === "importateur" || role === "exportateur" }
      );
      const list = Array.isArray(data) ? data : [];
      setShipments(list);
      setShipmentId((prev) => {
        if (prev) return prev;
        return list.length ? String(list[0].id) : "";
      });
    } catch (e) {
      setError(apiErrorMessage(e));
      setShipments([]);
    } finally {
      setLoadingShipments(false);
    }
  }, [role]);

  const loadDocs = useCallback(async () => {
    if (!shipmentId) {
      setRows([]);
      return;
    }
    setLoadingDocs(true);
    setError("");
    try {
      const { data } = await documentsApi.byShipment(shipmentId);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(apiErrorMessage(e));
      setRows([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (!isImageFile(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canPickFile = useMemo(() => Boolean(shipmentId), [shipmentId]);

  function onFileChosen(f) {
    if (!f) return;
    const name = f.name || "";
    const lower = name.toLowerCase();
    const ok =
      lower.endsWith(".pdf") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg");
    if (!ok) {
      setError("Only PDF, PNG, JPG, and JPEG files are allowed.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10 MB).");
      return;
    }
    setError("");
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    onFileChosen(f);
  }

  async function onUpload() {
    if (!shipmentId || !file) return;
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
      setToast("Document uploaded successfully.");
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

  async function onDownload(doc) {
    setBusyId(`dl-${doc.id}`);
    setError("");
    try {
      const { data } = await documentsApi.download(doc.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.original_name || "download";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(doc) {
    if (!window.confirm(`Delete “${doc.original_name}”?`)) return;
    setBusyId(`rm-${doc.id}`);
    setError("");
    try {
      await documentsApi.remove(doc.id);
      setToast("Document deleted.");
      await loadDocs();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onAiVerify(doc) {
    setBusyId(`ai-${doc.id}`);
    setError("");
    try {
      await documentsApi.aiVerify(doc.id);
      setToast("AI verification complete.");
      await loadDocs();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Documents</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload export documents for a shipment. Customs brokers can verify or run AI checks on submitted files.
        </p>
      </div>

      {toast ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900" role="status">
          {toast}
        </p>
      ) : null}

      <div className={shellClass}>
        <div className="mb-6 max-w-lg">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-700">Shipment</label>
          {loadingShipments ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading shipments…
            </div>
          ) : (
            <select
              className="mt-2 w-full rounded-lg border border-green-600/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-green-500/40"
              value={shipmentId}
              onChange={(e) => {
                setShipmentId(e.target.value);
                setToast("");
              }}
            >
              {shipments.length === 0 ? (
                <option value="">No shipments found</option>
              ) : (
                shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.reference} — {s.origin} → {s.destination}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        <div
          className={`relative flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
            isExporterTheme ? "border-green-500 bg-white/80" : "border-slate-300 bg-panel/50"
          } ${canPickFile ? "cursor-pointer hover:border-green-600" : "opacity-60"}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={canPickFile ? onDrop : undefined}
          onClick={() => canPickFile && inputRef.current?.click()}
          role="presentation"
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            disabled={!canPickFile || uploading}
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
          {!file ? (
            <>
              <p className="text-sm font-medium text-slate-800">Drag a file here or click to browse</p>
              <p className="mt-1 text-xs text-slate-500">PDF, PNG, JPG, or JPEG · max 10 MB</p>
            </>
          ) : (
            <div className="flex w-full max-w-md flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-12 w-12 text-green-700" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 text-left text-sm">
                <p className="truncate font-medium text-slate-900">{file.name}</p>
                <p className="text-slate-500">{formatBytes(file.size)}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-red-700 underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-700">Document type</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
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
          <div className="flex items-end">
            <button
              type="button"
              disabled={!canPickFile || !file || uploading}
              onClick={(e) => {
                e.stopPropagation();
                onUpload();
              }}
              className="w-full rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>

        {uploadPct != null ? (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-600">{uploadPct}%</p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className={shellClass}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Documents for this shipment</h2>
        {loadingDocs ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-green-50/80">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-800">File name</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Size</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Verified</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Uploaded</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-green-50/30">
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-900" title={doc.original_name}>
                      {doc.original_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{tradeLabel(doc.file_type)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatBytes(doc.file_size)}</td>
                    <td className="px-4 py-3">
                      {doc.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-green-700" title="Verified">
                          <Check className="h-5 w-5" aria-hidden />
                          <span className="sr-only">Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600" title="Pending verification">
                          <Clock className="h-5 w-5" aria-hidden />
                          <span className="sr-only">Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDate(doc.uploaded_at)}
                      {doc.uploader_name ? (
                        <span className="block text-xs text-slate-500">{doc.uploader_name}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-green-600 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
                          disabled={busyId === `dl-${doc.id}`}
                          onClick={() => onDownload(doc)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                          disabled={busyId === `rm-${doc.id}`}
                          onClick={() => onDelete(doc)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                        {isCourtier ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-300 px-2 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                            disabled={busyId === `ai-${doc.id}`}
                            onClick={() => onAiVerify(doc)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Verify
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && !loadingDocs ? (
              <p className="p-8 text-center text-sm text-slate-500">No documents for this shipment yet.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RoleGuard allowedRoles={["exportateur", "importateur", "admin", "courtier"]}>
      <DocumentsPageInner />
    </RoleGuard>
  );
}
