"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Leaf,
  Route,
  TrendingUp,
} from "lucide-react";

import { AreaChartEditorial } from "@/components/analytics/AreaChartEditorial";
import { PredictiveBiPanel } from "@/components/analytics/PredictiveBiPanel";
import { KpiSparkArea } from "@/components/app/KpiSparkArea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { buildTradeMetrics } from "@/lib/analytics-metrics";
import { analyticsApi, shipmentsApi } from "@/lib/api";

function TrendLine({ up, children, positiveIsGood = true }) {
  const good = positiveIsGood ? up : !up;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-xs ${
        good ? "text-success" : "text-destructive"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  );
}

function TopKpiCard({ label, value, delta, up, icon: Icon, series, positiveIsGood = true }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-paper transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow !text-[10px]">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl tracking-tight text-foreground tabular-nums">{value}</p>
      <TrendLine up={up} positiveIsGood={positiveIsGood}>
        {delta}
      </TrendLine>
      <div className="mt-4 -mx-1">
        <KpiSparkArea data={series} width={220} height={44} className="h-11 w-full" />
      </div>
    </div>
  );
}

function OpsMetricCard({ label, value, delta, series }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-paper">
      <p className="eyebrow !text-[10px]">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{delta}</p>
      <div className="mt-6">
        <KpiSparkArea data={series} width={200} height={48} className="h-12 w-full" />
      </div>
    </div>
  );
}

export function TradeAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [laneTab, setLaneTab] = useState("cost");
  const [global, setGlobal] = useState(null);
  const [shipAnalytics, setShipAnalytics] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [allShipments, setAllShipments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [g, s, d, ships] = await Promise.all([
        analyticsApi.global(),
        analyticsApi.shipments(),
        analyticsApi.documents(),
        shipmentsApi.getAll().catch(() => ({ data: [] })),
      ]);
      setGlobal(g.data);
      setShipAnalytics(s.data);
      setDocuments(d.data);
      setAllShipments(Array.isArray(ships.data) ? ships.data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(
    () => buildTradeMetrics(global, shipAnalytics, documents, allShipments),
    [global, shipAnalytics, documents, allShipments]
  );

  const laneSeries = useMemo(() => {
    if (laneTab === "volume") return metrics.laneChart.volume;
    if (laneTab === "sla") return metrics.laneChart.sla;
    return metrics.laneChart.cost;
  }, [laneTab, metrics]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8 border-2 border-kinetic/30 border-t-kinetic" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground md:text-[2.75rem]">
            Trade analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            BI opérationnel, analytics trade et intelligence prédictive (retards par historique transitaire + IA).
          </p>
        </div>
        <Link href="/dashboard/admin" className="btn-secondary text-sm">
          ← Network overview
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-kinetic/25 bg-gradient-to-b from-kinetic/5 to-card p-1 shadow-paper">
        <div className="rounded-[14px] bg-card p-6 md:p-8">
          <PredictiveBiPanel />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-stagger>
        <TopKpiCard
          label="Throughput · TEU"
          value={metrics.throughput.value}
          delta={metrics.throughput.delta}
          up={metrics.throughput.up}
          icon={TrendingUp}
          series={metrics.throughput.series}
        />
        <TopKpiCard
          label="Cost / TEU"
          value={metrics.costPerTeu.value}
          delta={metrics.costPerTeu.delta}
          up={metrics.costPerTeu.up}
          icon={DollarSign}
          series={metrics.costPerTeu.series}
          positiveIsGood={false}
        />
        <TopKpiCard
          label="Active lanes"
          value={metrics.activeLanes.value}
          delta={metrics.activeLanes.delta}
          up={metrics.activeLanes.up}
          icon={Route}
          series={metrics.activeLanes.series}
        />
        <TopKpiCard
          label="CO₂ · t"
          value={metrics.co2.value}
          delta={metrics.co2.delta}
          up={metrics.co2.up}
          icon={Leaf}
          series={metrics.co2.series}
          positiveIsGood={false}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow !text-[10px]">Lane performance · 6M</p>
              <h2 className="mt-1 font-display text-xl text-foreground">Network throughput</h2>
            </div>
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
              {[
                ["volume", "Volume"],
                ["cost", "Cost"],
                ["sla", "SLA"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLaneTab(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    laneTab === key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 min-h-[200px]">
            <AreaChartEditorial series={laneSeries} height={200} />
          </div>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            {laneTab === "volume" && "TEU equivalent from shipment volume (6-month trend)"}
            {laneTab === "cost" && "Declared cargo value per month (USD)"}
            {laneTab === "sla" && "On-time delivery index (%), derived from delivered vs delayed"}
          </p>
        </div>

        <aside className="rounded-xl border border-border bg-card p-6 shadow-paper">
          <p className="eyebrow !text-[10px]">Top suppliers</p>
          <h2 className="mt-1 font-display text-xl text-foreground">Partner scorecard</h2>
          <ul className="mt-6 divide-y divide-border">
            {metrics.suppliers.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-sm font-medium text-foreground">{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">{s.score}</span>
                  <span className="min-w-[2rem] text-end font-mono text-sm font-medium text-kinetic">
                    {s.grade}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Scores blend delivery completion, shipment value and document compliance on platform data.
          </p>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <OpsMetricCard
          label="Customs SLA · avg"
          value={metrics.operations.customsSla.value}
          delta={metrics.operations.customsSla.delta}
          series={metrics.operations.customsSla.series}
        />
        <OpsMetricCard
          label="On-time delivery"
          value={metrics.operations.onTime.value}
          delta={metrics.operations.onTime.delta}
          series={metrics.operations.onTime.series}
        />
        <OpsMetricCard
          label="Avg transit days"
          value={metrics.operations.avgTransit.value}
          delta={metrics.operations.avgTransit.delta}
          series={metrics.operations.avgTransit.series}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-kinetic" aria-hidden />
          <h2 className="font-display text-lg text-foreground">Platform snapshot</h2>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Active shipments", metrics.raw.totalShipments - metrics.raw.delivered],
            ["Delivered", metrics.raw.delivered],
            ["In customs queue", metrics.raw.customsHold],
            ["Documents verified", documents?.verified ?? "—"],
            ["AI verification rate", global?.ai_verification_rate != null ? `${global.ai_verification_rate}%` : "—"],
            ["Delay rate", global?.delay_rate_percent != null ? `${global.delay_rate_percent}%` : "—"],
            ["Monthly revenue", global?.monthly_revenue ? `$${Number(global.monthly_revenue).toLocaleString()}` : "—"],
            ["Active users", global?.total_users ?? "—"],
          ].map(([label, val]) => (
            <div key={label} className="rounded-lg border border-border bg-background px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-display text-xl text-foreground tabular-nums">{val}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
