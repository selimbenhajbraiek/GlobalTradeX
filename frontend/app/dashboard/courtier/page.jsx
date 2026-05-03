"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { analyticsApi, documentsApi, shipmentsApi } from "@/lib/api";

const BG = "#FBEAF0";
const ACCENT = "#993556";

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
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function confidencePercent(c) {
  if (typeof c !== "number" || Number.isNaN(c)) return 0;
  return c <= 1 ? Math.round(c * 100) : Math.min(100, Math.round(c));
}

function CourtierDashboardInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [shipmentCount, setShipmentCount] = useState(0);
  const [pending, setPending] = useState([]);
  const [recentVerified, setRecentVerified] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [panelMode, setPanelMode] = useState(null);
  const [aiResultById, setAiResultById] = useState({});
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipRes, docStats, pendRes, recentRes] = await Promise.all([
        shipmentsApi.getAll(),
        analyticsApi.documents(),
        documentsApi.pendingReview(),
        documentsApi.recentlyVerifiedToday(),
      ]);
      setShipmentCount((shipRes.data || []).length);
      setStats(docStats.data);
      setPending(pendRes.data || []);
      setRecentVerified(recentRes.data || []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAiVerify(doc) {
    setError(null);
    setExpandedId(doc.id);
    setPanelMode("ai");
    setAiLoadingId(doc.id);
    try {
      const { data } = await documentsApi.aiVerify(doc.id);
      const result = data?.ai_result || {};
      setAiResultById((m) => ({ ...m, [doc.id]: result }));
    } catch (e) {
      setError(apiErrorMessage(e));
      setExpandedId(null);
      setPanelMode(null);
    } finally {
      setAiLoadingId(null);
    }
  }

  function openManual(doc) {
    setError(null);
    setExpandedId(doc.id);
    setPanelMode("manual");
  }

  function closePanel() {
    setExpandedId(null);
    setPanelMode(null);
  }

  async function markVerified(doc) {
    setActionBusyId(doc.id);
    setError(null);
    try {
      await documentsApi.verify(doc.id, { is_verified: true });
      closePanel();
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setActionBusyId(null);
    }
  }

  async function markRejected(doc) {
    const reason = window.prompt("Rejection reason (optional):", "") ?? "";
    setActionBusyId(doc.id);
    setError(null);
    try {
      await documentsApi.verify(doc.id, {
        is_verified: false,
        rejection_reason: reason.trim() || undefined,
      });
      closePanel();
      await load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setActionBusyId(null);
    }
  }

  const kpis = [
    { label: "Total Documents", value: stats?.total_documents ?? "—" },
    { label: "Verified", value: stats?.verified ?? "—" },
    { label: "Pending Review", value: stats?.pending_review ?? "—" },
  ];

  const delayedStyleCount = Number(stats?.pending_review ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold" style={{ color: ACCENT }}>
          Customs broker
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-700">
          Review shipment documents, run AI checks, and record verification decisions. Shipments visible:{" "}
          <span className="font-semibold">{loading ? "…" : shipmentCount}</span>.
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
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950"
        role="status"
      >
        <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
          {delayedStyleCount}
        </span>
        <span>
          Documents still need review — prioritize missing compliance data before clearance deadlines.
        </span>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          Documents pending review
        </h2>
        <div className="overflow-x-auto rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-[#FBEAF0]/90">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Filename</th>
                <th className="px-4 py-3 font-medium text-gray-700">Document Type</th>
                <th className="px-4 py-3 font-medium text-gray-700">Shipment Reference</th>
                <th className="px-4 py-3 font-medium text-gray-700">Uploaded By</th>
                <th className="px-4 py-3 font-medium text-gray-700">Upload Date</th>
                <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.map((doc) => (
                <Fragment key={doc.id}>
                  <tr className="hover:bg-rose-50/40">
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-gray-900" title={doc.original_name}>
                      {doc.original_name || doc.filename}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{doc.file_type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{doc.shipment_reference || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{doc.uploader_name || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(doc.uploaded_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={aiLoadingId === doc.id}
                          onClick={() => runAiVerify(doc)}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-white shadow-sm disabled:opacity-60"
                          style={{ backgroundColor: ACCENT }}
                        >
                          {aiLoadingId === doc.id ? "Analyzing with AI…" : "AI Verify"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openManual(doc)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
                        >
                          Manual Review
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === doc.id ? (
                    <tr className="bg-[#FBEAF0]/70">
                      <td colSpan={6} className="px-4 py-4">
                        {panelMode === "ai" && aiLoadingId === doc.id ? (
                          <div className="flex items-center gap-3 text-sm" style={{ color: ACCENT }}>
                            <div
                              className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                              aria-hidden
                            />
                            Analyzing with AI…
                          </div>
                        ) : null}
                        {panelMode === "ai" && aiLoadingId !== doc.id ? (
                          <AiResultPanel
                            result={aiResultById[doc.id]}
                            onVerified={() => markVerified(doc)}
                            onReject={() => markRejected(doc)}
                            busy={actionBusyId === doc.id}
                          />
                        ) : null}
                        {panelMode === "manual" ? (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700">Record a manual decision without AI.</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={actionBusyId === doc.id}
                                onClick={() => markVerified(doc)}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                Mark as Verified
                              </button>
                              <button
                                type="button"
                                disabled={actionBusyId === doc.id}
                                onClick={() => markRejected(doc)}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                Reject
                              </button>
                              <button type="button" onClick={closePanel} className="rounded-lg border px-4 py-2 text-sm">
                                Close
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          {pending.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">No documents pending review.</p>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: ACCENT }}>
          Recently verified (today)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-rose-200/80 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-[#FBEAF0]/90">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Filename</th>
                <th className="px-4 py-3 font-medium text-gray-700">Shipment</th>
                <th className="px-4 py-3 font-medium text-gray-700">Verified at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentVerified.map((doc) => (
                <tr key={doc.id} className="hover:bg-rose-50/40">
                  <td className="px-4 py-3 font-medium text-gray-900">{doc.original_name || doc.filename}</td>
                  <td className="px-4 py-3 text-gray-600">{doc.shipment_reference || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(doc.verified_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentVerified.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-gray-500">No verifications yet today.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AiResultPanel({ result, onVerified, onReject, busy }) {
  const r = result || {};
  const valid = Boolean(r.valid);
  const missing = Array.isArray(r.missing_fields) ? r.missing_fields : [];
  const errs = Array.isArray(r.errors) ? r.errors : [];
  const pct = confidencePercent(r.confidence);

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-900">AI analysis</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          {valid ? (
            <span className="text-emerald-600" aria-hidden>
              ✓
            </span>
          ) : (
            <span className="text-rose-600" aria-hidden>
              ✗
            </span>
          )}
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Valid</p>
            <p className="text-sm text-gray-900">{valid ? "Passed basic checks" : "Issues detected"}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Document type</p>
          <p className="text-sm text-gray-900">{r.document_type || "—"}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Missing fields</p>
        <ul className="mt-1 space-y-1">
          {missing.length ? (
            missing.map((x, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-rose-700">
                <span aria-hidden>✗</span> {String(x)}
              </li>
            ))
          ) : (
            <li className="flex items-center gap-2 text-sm text-emerald-700">
              <span aria-hidden>✓</span> None flagged
            </li>
          )}
        </ul>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Errors / warnings</p>
        <ul className="mt-1 space-y-1">
          {errs.length ? (
            errs.map((x, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-rose-700">
                <span aria-hidden>✗</span> {String(x)}
              </li>
            ))
          ) : (
            <li className="flex items-center gap-2 text-sm text-emerald-700">
              <span aria-hidden>✓</span> None
            </li>
          )}
        </ul>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>Confidence</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-[#993556] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-rose-200/80 pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={onVerified}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Mark as Verified
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export default function CourtierPage() {
  return (
    <RoleGuard allowedRoles={["courtier", "admin"]}>
      <div className="min-h-screen bg-gradient-to-b from-rose-50/90 via-pink-50/50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <CourtierDashboardInner />
        </div>
      </div>
    </RoleGuard>
  );
}
