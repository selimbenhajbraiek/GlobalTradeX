"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Brain,
  LineChart,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";

import { AreaChartEditorial } from "@/components/analytics/AreaChartEditorial";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { analyticsApi } from "@/lib/api";

function riskBandClass(band) {
  const map = {
    critical: "bg-destructive/15 text-destructive ring-destructive/30",
    high: "bg-orange-500/15 text-orange-700 ring-orange-500/30",
    moderate: "bg-amber-500/15 text-amber-800 ring-amber-500/30",
    low: "bg-success/10 text-success ring-success/30",
  };
  return map[band] || "bg-muted text-muted-foreground ring-border";
}

function RiskBar({ percent }) {
  const p = Math.min(100, Math.max(0, Number(percent) || 0));
  const color = p >= 72 ? "bg-destructive" : p >= 48 ? "bg-orange-500" : p >= 28 ? "bg-amber-500" : "bg-success";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function KpiTile({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-paper">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow !text-[10px]">{label}</p>
        <Icon className="h-4 w-4 text-kinetic" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="mt-2 font-display text-3xl tracking-tight text-foreground tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PredictiveBiPanel({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const { data: res } = await analyticsApi.predictiveBi({ include_ai_summary: true });
      setData(res);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Impossible de charger le BI prédictif.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${compact ? "min-h-[200px]" : "min-h-[320px]"}`}>
        <LoadingSpinner className="h-8 w-8 border-2 border-kinetic/30 border-t-kinetic" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!data) return null;

  const summary = data.summary || {};
  const methodology = data.methodology || {};
  const ai = data.ai_insights || {};
  const trendSeries = (data.delay_trend_by_month || []).map((m) => ({
    label: m.month?.slice(5) || "",
    value: m.delay_rate_percent ?? 0,
  }));

  return (
    <div className={compact ? "space-y-6" : "space-y-8"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-kinetic" aria-hidden />
            Intelligence prédictive · BI + IA
          </p>
          <h2 className={`mt-2 font-display tracking-tight text-foreground ${compact ? "text-2xl" : "text-3xl"}`}>
            Prédiction des retards d&apos;expédition
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Modèle explicable alimenté par l&apos;historique des transitaires, les corridors logistiques et les
            signaux opérationnels — enrichi par une synthèse IA (Gemini).
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          Actualiser
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Expéditions à risque"
          value={summary.at_risk_count ?? 0}
          hint={`sur ${summary.active_shipments ?? 0} actives (probabilité ≥ 40 %)`}
          icon={AlertTriangle}
        />
        <KpiTile
          label="Risque élevé / critique"
          value={summary.high_risk_count ?? 0}
          hint="Prioriser les actions transitaire"
          icon={TrendingUp}
        />
        <KpiTile
          label="Taux retard historique"
          value={`${methodology.global_delay_rate_percent ?? 0} %`}
          hint={`${methodology.training_samples ?? 0} expéditions analysées`}
          icon={LineChart}
        />
        <KpiTile
          label="Transitaires évalués"
          value={summary.forwarders_analyzed ?? 0}
          hint="Score de fiabilité par partenaire"
          icon={Truck}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper lg:col-span-2">
          <p className="eyebrow !text-[10px]">Tendance BI · 6 mois</p>
          <h3 className="mt-1 font-display text-lg text-foreground">Taux de retard observé</h3>
          <div className="mt-4 min-h-[180px]">
            <AreaChartEditorial series={trendSeries} height={180} />
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            Baseline transit : {methodology.avg_transit_days_baseline ?? "—"} j · Modèle :{" "}
            {methodology.model}
          </p>
        </div>

        <div className="rounded-xl border border-kinetic/20 bg-gradient-to-br from-kinetic/5 to-card p-6 shadow-paper">
          <p className="eyebrow !text-[10px] flex items-center gap-1.5 text-kinetic">
            <Sparkles className="h-3 w-3" aria-hidden />
            Synthèse IA
            {ai.ai_enhanced ? " · Gemini" : " · règles métier"}
          </p>
          <div className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {ai.summary_text || "Aucune synthèse disponible."}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper">
          <div className="border-b border-border px-5 py-4">
            <p className="eyebrow !text-[10px]">Performance transitaires</p>
            <h3 className="mt-1 font-display text-lg text-foreground">Historique & fiabilité</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-normal">Transitaire</th>
                  <th className="px-5 py-3 font-normal">Expéditions</th>
                  <th className="px-5 py-3 font-normal">Retards</th>
                  <th className="px-5 py-3 font-normal">Score</th>
                  <th className="px-5 py-3 font-normal">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.forwarder_performance || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      Données insuffisantes — assignez des transitaires aux expéditions.
                    </td>
                  </tr>
                ) : (
                  data.forwarder_performance.map((f) => (
                    <tr key={f.forwarder_id} className="hover:bg-accent/30">
                      <td className="px-5 py-3 font-medium text-foreground">{f.forwarder_name}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{f.shipments_handled}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">
                        {f.delay_rate_percent} %
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums">{f.reliability_score}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-md bg-kinetic/10 px-2 py-0.5 font-mono text-xs font-semibold text-kinetic">
                          {f.grade}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper">
          <div className="border-b border-border px-5 py-4">
            <p className="eyebrow !text-[10px]">Corridors à risque</p>
            <h3 className="mt-1 font-display text-lg text-foreground">Analyse par lane</h3>
          </div>
          <ul className="divide-y divide-border">
            {(data.lane_risk || []).slice(0, 8).map((lane) => (
              <li key={lane.lane_key} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {lane.origin} → {lane.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lane.transport_mode} · {lane.sample_size} expédition(s)
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ring-1 ${
                      lane.risk_level === "high"
                        ? "bg-destructive/10 text-destructive ring-destructive/20"
                        : lane.risk_level === "medium"
                          ? "bg-amber-500/10 text-amber-800 ring-amber-500/20"
                          : "bg-success/10 text-success ring-success/20"
                    }`}
                  >
                    {lane.delay_rate_percent} %
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="eyebrow !text-[10px] flex items-center gap-1.5">
              <Shield className="h-3 w-3" aria-hidden />
              Prédictions actives
            </p>
            <h3 className="mt-1 font-display text-lg text-foreground">Expéditions susceptibles de retarder</h3>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            Probabilité moyenne : {summary.avg_delay_probability_percent ?? 0} %
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-normal">Référence</th>
                <th className="px-5 py-3 font-normal">Corridor</th>
                <th className="px-5 py-3 font-normal">Transitaire</th>
                <th className="px-5 py-3 font-normal">Risque</th>
                <th className="px-5 py-3 font-normal min-w-[140px]">Probabilité</th>
                <th className="px-5 py-3 font-normal">Jours estimés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data.at_risk_shipments || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    Aucune expédition active au-dessus du seuil de risque.
                  </td>
                </tr>
              ) : (
                data.at_risk_shipments.map((row) => (
                  <tr key={row.shipment_id} className="align-top hover:bg-accent/30">
                    <td className="px-5 py-4 font-mono text-xs font-medium text-foreground">{row.reference}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {row.origin}
                      <br />
                      → {row.destination}
                    </td>
                    <td className="px-5 py-4 text-xs text-foreground">{row.forwarder_name || "—"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${riskBandClass(row.risk_band)}`}
                      >
                        {row.risk_band}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <RiskBar percent={row.delay_probability_percent} />
                        <span className="font-mono text-xs tabular-nums">{row.delay_probability_percent} %</span>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                        {(row.risk_factors || []).slice(0, 2).map((f) => (
                          <li key={f}>• {f}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm tabular-nums text-foreground">
                      +{row.predicted_additional_delay_days} j
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!compact ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Méthodologie :</strong>{" "}
          {(methodology.factors || []).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}
