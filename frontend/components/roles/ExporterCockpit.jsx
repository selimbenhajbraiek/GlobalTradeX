"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Ship, TrendingUp, Users } from "lucide-react";

import { AreaChartEditorial } from "@/components/analytics/AreaChartEditorial";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { analyticsApi, shipmentsApi } from "@/lib/api";
import {
  computeExporterKpis,
  exporterRecommendations,
  topCustomersFromShipments,
} from "@/lib/role-dashboard";

import { RoleKpiCard } from "./RoleKpiCard";

function apiErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  return e?.message || "Failed to load data.";
}

export function ExporterCockpit() {
  const [shipments, setShipments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [shipRes, analyticsRes] = await Promise.all([
        shipmentsApi.getAll(),
        analyticsApi.shipments().catch(() => ({ data: null })),
      ]);
      setShipments(Array.isArray(shipRes.data) ? shipRes.data : []);
      setAnalytics(analyticsRes.data);
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

  const kpis = useMemo(
    () => computeExporterKpis(shipments, analytics),
    [shipments, analytics]
  );

  const customers = useMemo(() => topCustomersFromShipments(shipments), [shipments]);
  const recommendations = useMemo(() => exporterRecommendations(shipments), [shipments]);

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
        <p className="eyebrow">Role · Exporter</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
          Outbound performance
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Quote-to-cash visibility across your top customers, lanes and invoices.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoleKpiCard label="Outbound shipments" value={kpis.outbound.value} delta={kpis.outbound.delta} up={kpis.outbound.up} icon={Ship} series={kpis.outbound.series} />
        <RoleKpiCard label="Revenue · MTD" value={kpis.revenue.value} delta={kpis.revenue.delta} up={kpis.revenue.up} icon={DollarSign} series={kpis.revenue.series} />
        <RoleKpiCard label="Active buyers" value={kpis.buyers.value} delta={kpis.buyers.delta} up={kpis.buyers.up} icon={Users} series={kpis.buyers.series} />
        <RoleKpiCard label="Delivery rate" value={kpis.retention.value} delta={kpis.retention.delta} up={kpis.retention.up} icon={TrendingUp} series={kpis.retention.series} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow !text-[10px]">Revenue · 12M</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{kpis.revenue.delta}</p>
            </div>
          </div>
          <div className="mt-4 h-48">
            <AreaChartEditorial series={kpis.revenue12m} height={180} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
          <p className="eyebrow !text-[10px]">AI recommendations</p>
          <ul className="mt-4 space-y-4">
            {recommendations.map((rec) => (
              <li key={rec.kind} className="rounded-lg border border-border bg-background p-4">
                <p className={`text-xs font-medium uppercase tracking-wide ${rec.tone}`}>{rec.kind}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{rec.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-xl text-foreground">Top customers</h2>
          <span className="eyebrow !text-[10px]">This quarter</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Customer", "Region", "Volume", "Revenue", "Trend", "Status"].map((h) => (
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
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No customer data yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.name} className="hover:bg-accent/40">
                    <td className="px-5 py-4 font-medium text-foreground">{c.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{c.region}</td>
                    <td className="px-5 py-4">
                      <span className="font-medium tabular-nums text-foreground">{c.volume}</span>
                      <span className="ml-1 text-xs text-muted-foreground">TEU</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-foreground">{c.revenue}</td>
                    <td
                      className={`px-5 py-4 font-mono text-sm ${
                        c.trendUp ? "text-success" : "text-destructive"
                      }`}
                    >
                      {c.trend}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
