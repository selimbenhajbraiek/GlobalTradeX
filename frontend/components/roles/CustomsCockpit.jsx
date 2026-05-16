"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, FileCheck, Shield } from "lucide-react";

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

export function CustomsCockpit() {
  const [shipments, setShipments] = useState([]);
  const [pending, setPending] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [docAnalytics, setDocAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jurisdiction, setJurisdiction] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
    const accuracy =
      total > 0 ? `${Math.round((verified / total) * 1000) / 10}%` : "—";
    return {
      accuracy,
      auto: String(auto),
      verified: String(verified),
      manual: String(manual),
      total,
    };
  }, [allDocs, docAnalytics]);

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
        <p className="eyebrow">Role · Customs agent</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
          Declarations & compliance
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A clean queue of every entry that needs your eyes — pre-classified, pre-validated, ready to file.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoleKpiCard label="Pending review" value={kpis.pending.value} delta={kpis.pending.delta} up={false} icon={Clock} series={kpis.pending.series} positiveIsGood={false} />
        <RoleKpiCard label="Approved · today" value={kpis.approved.value} delta={kpis.approved.delta} up={kpis.approved.up} icon={FileCheck} series={kpis.approved.series} />
        <RoleKpiCard label="Compliance score" value={kpis.compliance.value} delta={kpis.compliance.delta} up={kpis.compliance.up} icon={Shield} series={kpis.compliance.series} />
        <RoleKpiCard label="Open exceptions" value={kpis.exceptions.value} delta={kpis.exceptions.delta} up={kpis.exceptions.up} icon={AlertTriangle} series={kpis.exceptions.series} positiveIsGood={false} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="eyebrow !text-[10px]">Queue</p>
              <h2 className="mt-1 font-display text-xl text-foreground">Declarations</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All jurisdictions</option>
                <option value="eu">EU</option>
                <option value="us">US</option>
                <option value="sg">SG</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All statuses</option>
                <option value="pending review">Pending review</option>
                <option value="approved">Approved</option>
                <option value="ai verified">AI verified</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Declaration", "Jurisdiction", "Type", "HS Code", "Value", "Status"].map((h) => (
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
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      No declarations in queue.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-accent/40">
                      <td className="px-5 py-4 font-mono text-sm font-medium text-foreground">{row.id}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{row.jurisdiction}</td>
                      <td className="px-5 py-4 text-sm text-foreground">{row.type}</td>
                      <td className="px-5 py-4 font-mono text-xs text-foreground">{row.hsCode}</td>
                      <td className="px-5 py-4 font-mono text-sm text-foreground">{row.value}</td>
                      <td className="px-5 py-4">
                        <DeclarationStatusPill status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
            <p className="eyebrow !text-[10px]">AI pre-classification</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{aiStats.accuracy}</span> verification rate across{" "}
              {aiStats.total} documents on file.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "AUTO", value: aiStats.auto },
                { label: "VERIFIED", value: aiStats.verified },
                { label: "MANUAL", value: aiStats.manual },
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
            <p className="eyebrow !text-[10px]">Compliance alerts</p>
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
    </div>
  );
}
