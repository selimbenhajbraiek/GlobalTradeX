"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, FileCheck, Loader2, Shield, Sparkles, X } from "lucide-react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { analyticsApi, documentsApi, shipmentsApi } from "@/lib/api";
import {
  computeCustomsKpis,
  customsAlertsFromData,
  declarationFromDoc,
} from "@/lib/role-dashboard";

import { DeclarationStatusPill } from "./DeclarationStatusPill";
import { RoleKpiCard } from "./RoleKpiCard";

function apiErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  return e?.message || "Failed to load data.";
}

function aiSummary(doc) {
  const ai = doc?.ai_result;
  if (!ai || typeof ai !== "object") return null;
  return (
    ai.summary ||
    ai.notes ||
    ai.recommendation ||
    (ai.valid === false ? ai.rejection_reason : null) ||
    null
  );
}

export function CustomsCockpit() {
  const [shipments, setShipments] = useState([]);
  const [pending, setPending] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [docAnalytics, setDocAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [jurisdiction, setJurisdiction] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [shipRes, pendingRes, docsRes, docStatsRes] = await Promise.all([
        shipmentsApi.getAll(),
        documentsApi.pendingReview().catch(() => ({ data: [] })),
        documentsApi.list().catch(() => ({ data: [] })),
        analyticsApi.documents().catch(() => ({ data: null })),
      ]);
      setShipments(Array.isArray(shipRes.data) ? shipRes.data : []);
      setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      setAllDocs(Array.isArray(docsRes.data) ? docsRes.data : []);
      setDocAnalytics(docStatsRes.data);
      setError("");
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const verifiedToday = useMemo(() => {
    const today = new Date().toDateString();
    return allDocs.filter(
      (d) => d.is_verified && d.uploaded_at && new Date(d.uploaded_at).toDateString() === today
    ).length;
  }, [allDocs]);

  const kpis = useMemo(
    () => computeCustomsKpis(pending, verifiedToday, shipments, docAnalytics),
    [pending, verifiedToday, shipments, docAnalytics]
  );

  const complianceAlerts = useMemo(
    () => customsAlertsFromData(pending, shipments),
    [pending, shipments]
  );

  const declarations = useMemo(() => {
    const source = pending.length ? pending : allDocs.filter((d) => !d.is_verified);
    return source.map(declarationFromDoc);
  }, [pending, allDocs]);

  const filtered = useMemo(() => {
    return declarations.filter((d) => {
      if (jurisdiction !== "all" && !d.jurisdiction.toLowerCase().includes(jurisdiction)) return false;
      if (statusFilter !== "all" && d.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      return true;
    });
  }, [declarations, jurisdiction, statusFilter]);

  const aiStats = useMemo(() => {
    const withAi = allDocs.filter((d) => d.ai_result);
    const auto = withAi.filter((d) => d.is_verified).length;
    const manual = allDocs.filter((d) => !d.ai_result).length;
    const total = docAnalytics?.total_documents ?? allDocs.length;
    const verified = docAnalytics?.verified ?? allDocs.filter((d) => d.is_verified).length;
    const accuracy = total > 0 ? `${Math.round((verified / total) * 1000) / 10}%` : "—";
    return {
      accuracy,
      auto: String(auto),
      verified: String(verified),
      manual: String(manual),
      total,
    };
  }, [allDocs, docAnalytics]);

  async function onAiVerify(docId) {
    setBusyId(docId);
    setError("");
    try {
      await documentsApi.aiVerify(docId);
      setSuccess("Analyse IA terminée — vous pouvez approuver ou refuser.");
      await load();
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onApprove(doc) {
    setBusyId(doc.id);
    setError("");
    try {
      await documentsApi.verify(doc.id, { is_verified: true });
      setSuccess(`Document « ${doc.original_name} » approuvé.`);
      await load();
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setError("Indiquez un motif de refus.");
      return;
    }
    setBusyId(rejectTarget.id);
    setError("");
    try {
      await documentsApi.verify(rejectTarget.id, {
        is_verified: false,
        rejection_reason: reason,
      });
      setSuccess(`Document « ${rejectTarget.original_name} » refusé.`);
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setBusyId(null);
    }
  }

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
        <p className="eyebrow">Rôle · Courtier en douane</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
          File d&apos;attente & conformité
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Traitez les pièces en attente : lancez l&apos;analyse IA, puis approuvez ou refusez depuis cette file.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoleKpiCard label="En attente" value={kpis.pending.value} delta={kpis.pending.delta} up={false} icon={Clock} series={kpis.pending.series} positiveIsGood={false} />
        <RoleKpiCard label="Approuvés · aujourd&apos;hui" value={kpis.approved.value} delta={kpis.approved.delta} up={kpis.approved.up} icon={FileCheck} series={kpis.approved.series} />
        <RoleKpiCard label="Score conformité" value={kpis.compliance.value} delta={kpis.compliance.delta} up={kpis.compliance.up} icon={Shield} series={kpis.compliance.series} />
        <RoleKpiCard label="Exceptions" value={kpis.exceptions.value} delta={kpis.exceptions.delta} up={kpis.exceptions.up} icon={AlertTriangle} series={kpis.exceptions.series} positiveIsGood={false} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="eyebrow !text-[10px]">File d&apos;attente</p>
              <h2 className="mt-1 font-display text-xl text-foreground">Documents à traiter</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Toutes juridictions</option>
                <option value="eu">UE</option>
                <option value="us">US</option>
                <option value="sg">SG</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending review">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="ai verified">Analysé par IA</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Document", "Expédition", "Juridiction", "Type", "Code SH", "Valeur", "Statut", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                      Aucun document dans la file.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const doc = row.doc;
                    const busy = busyId === doc.id;
                    const hasAi = Boolean(doc.ai_result);
                    const canAi = !doc.is_verified && !hasAi;
                    const canDecide = !doc.is_verified;
                    const summary = aiSummary(doc);

                    return (
                      <tr key={row.id} className="align-top hover:bg-accent/40">
                        <td className="px-5 py-4">
                          <p className="max-w-[160px] truncate text-sm font-medium text-foreground" title={doc.original_name}>
                            {doc.original_name}
                          </p>
                          {summary ? (
                            <p className="mt-1 max-w-[200px] text-[11px] leading-snug text-muted-foreground">
                              {String(summary).slice(0, 100)}
                              {String(summary).length > 100 ? "…" : ""}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-foreground">
                          {doc.shipment_reference || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{row.jurisdiction}</td>
                        <td className="px-5 py-4 text-sm text-foreground">{row.type}</td>
                        <td className="px-5 py-4 font-mono text-xs text-foreground">{row.hsCode}</td>
                        <td className="px-5 py-4 font-mono text-sm text-foreground">{row.value}</td>
                        <td className="px-5 py-4">
                          <DeclarationStatusPill status={row.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-[140px] flex-col gap-1.5">
                            {canAi ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => onAiVerify(doc.id)}
                                className="inline-flex items-center justify-center gap-1 rounded-md border border-kinetic/40 bg-kinetic/10 px-2 py-1 text-[11px] font-medium text-kinetic hover:bg-kinetic/20 disabled:opacity-50"
                              >
                                {busy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                ) : (
                                  <Sparkles className="h-3 w-3" aria-hidden />
                                )}
                                Lancer l&apos;analyse IA
                              </button>
                            ) : null}
                            {canDecide ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => onApprove(doc)}
                                  className="inline-flex items-center justify-center gap-1 rounded-md border border-success/40 bg-success/10 px-2 py-1 text-[11px] font-medium text-success hover:bg-success/20 disabled:opacity-50"
                                >
                                  <Check className="h-3 w-3" aria-hidden />
                                  Approuver
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setRejectTarget(doc);
                                    setRejectReason("");
                                    setError("");
                                  }}
                                  className="inline-flex items-center justify-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" aria-hidden />
                                  Refuser
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Traité</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
            <p className="eyebrow !text-[10px]">Pré-classification IA</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{aiStats.accuracy}</span> taux de vérification sur{" "}
              {aiStats.total} documents.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "AUTO", value: aiStats.auto },
                { label: "VÉRIFIÉS", value: aiStats.verified },
                { label: "MANUEL", value: aiStats.manual },
              ].map((box) => (
                <div
                  key={box.label}
                  className="rounded-lg border border-border bg-background px-2 py-3 text-center"
                >
                  <p className="font-mono text-sm font-medium text-foreground">{box.value}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase text-muted-foreground">{box.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
            <p className="eyebrow !text-[10px]">Alertes conformité</p>
            <ul className="mt-4 space-y-3">
              {complianceAlerts.map((a) => (
                <li
                  key={a.text}
                  className={`rounded-lg border-s-4 bg-background px-4 py-3 text-sm leading-relaxed text-foreground ${a.border}`}
                >
                  {a.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {rejectTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-doc-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-paper">
            <h3 id="reject-doc-title" className="font-display text-lg text-foreground">
              Refuser le document
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{rejectTarget.original_name}</p>
            <label className="mt-4 block text-xs font-medium text-foreground">
              Motif de refus
              <textarea
                className="mt-1 min-h-[88px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex. : pièce illisible, code SH incorrect…"
                required
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busyId === rejectTarget.id}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                onClick={submitReject}
              >
                {busyId === rejectTarget.id ? "Envoi…" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
