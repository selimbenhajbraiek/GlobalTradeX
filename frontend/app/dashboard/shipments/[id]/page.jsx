"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  FileText,
  Plane,
  Ship,
  Train,
  Truck,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { documentsApi, shipmentsApi } from "@/lib/api";

const TIMELINE = [
  { key: "pending", label: "Pending" },
  { key: "in_transit", label: "In transit" },
  { key: "customs_hold", label: "Customs hold" },
  { key: "delivered", label: "Delivered" },
];

const TRADE_LABELS = {
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  certificate_of_origin: "Certificate of Origin",
  bill_of_lading: "Bill of Lading",
  customs_declaration: "Customs Declaration",
  other: "Other",
};

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

function ModeIcon({ mode }) {
  const m = String(mode || "").toLowerCase();
  const cls = "h-6 w-6";
  if (m === "air") return <Plane className={cls} aria-hidden />;
  if (m === "sea") return <Ship className={cls} aria-hidden />;
  if (m === "rail") return <Train className={cls} aria-hidden />;
  return <Truck className={cls} aria-hidden />;
}

function tradeLabel(v) {
  return TRADE_LABELS[v] || String(v || "").replace(/_/g, " ") || "—";
}

function timelineMeta(status) {
  const s = String(status || "").toLowerCase();
  if (s === "cancelled") return { idx: -1, delayed: false };
  if (s === "delayed") return { idx: 1, delayed: true };
  const idx = TIMELINE.findIndex((t) => t.key === s);
  return { idx: idx >= 0 ? idx : 0, delayed: false };
}

function NotificationIcon({ type }) {
  const t = String(type || "").toLowerCase();
  if (t === "success") return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />;
  if (t === "warning") return <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden />;
  if (t === "error") return <AlertCircle className="h-5 w-5 text-red-600" aria-hidden />;
  return <Clock3 className="h-5 w-5 text-slate-400" aria-hidden />;
}

function ShipmentDetailInner() {
  const params = useParams();
  const id = params?.id;
  const auth = useAuth();
  const role = normalizeRole(auth.user?.role);
  const canUpdateStatus = role === "transitaire" || role === "admin";

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await shipmentsApi.getById(id);
      setRow(data);
      setStatus(data.status);
    } catch (e) {
      setError(apiErrorMessage(e));
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveStatus() {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await shipmentsApi.updateStatus(id, { new_status: status });
      setRow(data);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function downloadDoc(docId, name) {
    try {
      const { data } = await documentsApi.download(docId);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  const { idx: currentIdx, delayed } = useMemo(
    () => timelineMeta(row?.status),
    [row?.status]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !row) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
        <Link href="/dashboard/shipments" className="text-blue-700 underline">
          Back to shipments
        </Link>
      </div>
    );
  }

  if (!row) return null;

  const documents = row.documents || [];
  const notifications = row.notifications || [];
  const owner = row.owner || {};

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Shipment</p>
          <h1 className="font-display text-3xl font-semibold text-slate-900">{row.reference}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <ModeIcon mode={row.transport_mode} />
            <span>
              {row.origin} → {row.destination}
            </span>
            <span className="text-slate-400">·</span>
            <span className="capitalize">{String(row.transport_mode).replace(/_/g, " ")}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Owner: {owner.full_name || "—"} · {owner.email || "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
              row.status === "delivered"
                ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                : row.status === "customs_hold"
                  ? "bg-amber-100 text-amber-900 ring-amber-200"
                  : "bg-sky-100 text-sky-900 ring-sky-200"
            }`}
          >
            {String(row.status).replace(/_/g, " ")}
          </span>
          {delayed ? (
            <span className="text-xs font-medium text-amber-700">Also marked: delayed</span>
          ) : null}
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border-2 border-blue-500 bg-sky-50 p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-600">Departure</p>
            <p className="mt-1 text-sm text-slate-900">{row.departure_date || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600">Arrival (est.)</p>
            <p className="mt-1 text-sm text-slate-900">{row.arrival_date || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600">Cargo</p>
            <p className="mt-1 text-sm capitalize text-slate-900">{row.cargo_type}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600">Updated</p>
            <p className="mt-1 text-sm text-slate-900">{formatDate(row.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {currentIdx < 0 ? (
        <p className="text-sm text-slate-600">This shipment was cancelled.</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Status timeline</h2>
          <div className="mt-6 flex w-full items-center gap-1 overflow-x-auto pb-2">
            {TIMELINE.map((step, i) => {
              const done = i < currentIdx;
              const current = i === currentIdx;
              return (
                <Fragment key={step.key}>
                  <div className="flex min-w-[72px] flex-col items-center text-center">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : current
                            ? "bg-blue-600 text-white ring-4 ring-blue-200"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {done ? <Check className="h-5 w-5" /> : i + 1}
                    </div>
                    <p className="mt-2 max-w-[96px] text-[11px] font-medium leading-tight text-slate-800">
                      {step.label}
                    </p>
                  </div>
                  {i < TIMELINE.length - 1 ? (
                    <div
                      className={`mb-6 h-0.5 min-w-[16px] flex-1 ${i < currentIdx ? "bg-emerald-400" : "bg-slate-200"}`}
                      aria-hidden
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                No documents uploaded for this shipment yet.
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 h-8 w-8 shrink-0 text-blue-700" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900" title={doc.original_name}>
                        {doc.original_name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {tradeLabel(doc.file_type)}
                        </span>
                        {doc.is_verified ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                            Pending review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-50"
                    onClick={() => downloadDoc(doc.id, doc.original_name)}
                  >
                    Download
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          <div className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500">No notifications for this shipment yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex gap-2">
                    <NotificationIcon type={n.notification_type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{n.message}</p>
                      <p className="mt-2 text-[10px] text-slate-400">{formatDate(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {canUpdateStatus ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-medium text-slate-900">Update status (operations)</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              className="input-field max-w-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">pending</option>
              <option value="in_transit">in_transit</option>
              <option value="customs_hold">customs_hold</option>
              <option value="delivered">delivered</option>
              <option value="delayed">delayed</option>
              <option value="cancelled">cancelled</option>
            </select>
            <button
              type="button"
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              onClick={saveStatus}
              disabled={saving}
            >
              {saving ? "Saving…" : "Apply status"}
            </button>
          </div>
          {error && row ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      ) : null}

      <div className="flex gap-3">
        <Link
          href="/dashboard/shipments"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          ← All shipments
        </Link>
        <Link
          href="/dashboard/documents"
          className="rounded-xl border border-blue-200 bg-sky-50 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-sky-100"
        >
          Documents hub
        </Link>
        {row.origin_lat != null ? (
          <Link
            href={`/dashboard/shipments/${id}/tracking`}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            Live GPS tracking
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function ShipmentDetailPage() {
  return (
    <RoleGuard allowedRoles={["importateur", "exportateur", "transitaire", "courtier", "admin"]}>
      <ShipmentDetailInner />
    </RoleGuard>
  );
}
