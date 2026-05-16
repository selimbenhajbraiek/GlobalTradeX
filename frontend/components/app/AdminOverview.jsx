"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  DollarSign,
  FileCheck,
  Package,
  Users,
} from "lucide-react";

import { WorldMap } from "@/components/brand/WorldMap";
import { ThroughputChart, KpiSparkArea } from "@/components/app/KpiSparkArea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { analyticsApi, notificationsApi, trackingApi } from "@/lib/api";
import { formatMoneyCompact, statusClass, statusLabel } from "@/lib/role-dashboard";

function DashboardKpiCard({ label, value, delta, up, icon: Icon, series }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-paper transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow !text-[10px]">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/50">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl tracking-tight text-foreground tabular-nums">{value}</p>
      <span
        className={`mt-1 inline-flex items-center gap-0.5 font-mono text-xs ${
          up ? "text-success" : "text-muted-foreground"
        }`}
      >
        {up ? (
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        ) : (
          <ArrowDownRight className="h-3 w-3" aria-hidden />
        )}
        {delta}
      </span>
      <div className="mt-4 -mx-1">
        <KpiSparkArea width={200} height={44} className="h-11 w-full" data={series} />
      </div>
    </div>
  );
}

function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function initialsFromName(name) {
  return (name || "SY")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminOverview() {
  const [globalData, setGlobalData] = useState(null);
  const [shipAnalytics, setShipAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [trackingCount, setTrackingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [globalRes, shipRes, notifRes, trackRes] = await Promise.all([
        analyticsApi.global(),
        analyticsApi.shipments(),
        notificationsApi.list({ limit: 8, unread_only: false }),
        trackingApi.active().catch(() => ({ data: [] })),
      ]);
      setGlobalData(globalRes.data);
      setShipAnalytics(shipRes.data);
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : []);
      setTrackingCount(Array.isArray(trackRes.data) ? trackRes.data.length : 0);
    } catch (e) {
      setError(e?.message || "Could not load platform overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const g = globalData;
    const trends = g?.kpi_trends || {};
    const monthSeries = (g?.shipments_by_month || []).map((m) => m.count);
    const revenue = Number(g?.monthly_revenue || 0);

    return [
      {
        label: "Active shipments",
        value: (g?.total_shipments ?? 0).toLocaleString(),
        delta: `${trends.shipments_percent >= 0 ? "+" : ""}${trends.shipments_percent ?? 0}% MoM`,
        up: (trends.shipments_percent ?? 0) >= 0,
        icon: Package,
        series: monthSeries.length ? monthSeries : [0],
      },
      {
        label: "Revenue · MTD",
        value: formatMoneyCompact(revenue),
        delta: `${trends.declared_value_percent >= 0 ? "+" : ""}${trends.declared_value_percent ?? 0}% MoM`,
        up: (trends.declared_value_percent ?? 0) >= 0,
        icon: DollarSign,
        series: monthSeries.length ? monthSeries : [revenue],
      },
      {
        label: "Customs queue",
        value: String(g?.customs_queue ?? g?.pending_documents ?? 0),
        delta: g?.avg_delivery_days
          ? `${g.avg_delivery_days}d avg delivery`
          : "Broker review queue",
        up: (g?.customs_queue ?? 0) < 20,
        icon: FileCheck,
        series: monthSeries.length ? monthSeries.map((n) => Math.round(n * 0.12)) : [0],
      },
      {
        label: "Active users",
        value: (g?.total_users ?? 0).toLocaleString(),
        delta: `${trends.users_percent >= 0 ? "+" : ""}${trends.users_percent ?? 0}% MoM`,
        up: (trends.users_percent ?? 0) >= 0,
        icon: Users,
        series: monthSeries.length ? monthSeries : [0],
      },
    ];
  }, [globalData]);

  const alerts = useMemo(() => {
    if (!notifications.length) {
      return [
        {
          dot: "bg-muted-foreground",
          title: "No alerts",
          sub: "Platform notifications will appear here.",
        },
      ];
    }
    return notifications.slice(0, 5).map((n) => ({
      dot:
        n.type === "warning" || n.type === "error"
          ? "bg-warning"
          : n.type === "success"
            ? "bg-success"
            : "bg-kinetic",
      title: n.title,
      sub: n.message,
    }));
  }, [notifications]);

  const activity = useMemo(() => {
    const recent = shipAnalytics?.recent_shipments || [];
    if (!recent.length) {
      return notifications.slice(0, 5).map((n) => ({
        initials: "NT",
        text: `${n.title}: ${n.message}`,
        time: relativeTime(n.created_at),
      }));
    }
    return recent.slice(0, 5).map((s) => ({
      initials: initialsFromName(s.owner_name),
      text: `${s.owner_name || "User"} · ${s.reference} ${statusLabel(s.status).toLowerCase()}`,
      time: relativeTime(s.created_at),
    }));
  }, [shipAnalytics, notifications]);

  const recentShipments = useMemo(() => {
    const recent = shipAnalytics?.recent_shipments || [];
    return recent.slice(0, 4).map((s) => {
      const o = (s.origin || "").split(",")[0];
      const d = (s.destination || "").split(",")[0];
      return {
        id: s.reference || `GTX-${s.id}`,
        href: `/dashboard/shipments/${s.id}`,
        route: `${o} → ${d}`,
        eta: s.arrival_date
          ? new Date(s.arrival_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          : "—",
        status: statusLabel(s.status),
        statusClass: statusClass(s.status),
      };
    });
  }, [shipAnalytics]);

  const teuEstimate = useMemo(() => {
    const total = globalData?.total_shipments ?? 0;
    return Math.round(total * 42).toLocaleString();
  }, [globalData]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Admin · Today</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground md:text-[2.75rem]">
            Network overview
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Live platform metrics from your shipment ledger, documents, and notifications.
          </p>
        </div>
        <Link href="/dashboard/shipments" className="btn-primary shrink-0">
          View all shipments
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-stagger>
        {kpis.map((kpi) => (
          <DashboardKpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow !text-[10px]">Network · Live</p>
              <h2 className="mt-1 font-display text-xl text-foreground">Global routes</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              {globalData?.tracking_in_motion ?? trackingCount} in motion
            </span>
          </div>
          <div className="mt-6 min-h-[220px]">
            <WorldMap />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-1 flex-col rounded-xl border border-border bg-card p-6 shadow-paper">
            <p className="eyebrow !text-[10px]">Throughput · 30d</p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-foreground">{teuEstimate} TEU</p>
            <p className="mt-1 text-xs text-muted-foreground">Estimated from active shipment volume</p>
            <div className="mt-4 flex-1 min-h-[120px]">
              <ThroughputChart
                className="h-full min-h-[120px]"
                data={(globalData?.shipments_by_month || []).map((m) => m.count)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
            <p className="eyebrow !text-[10px]">Alerts</p>
            <ul className="mt-4 space-y-4">
              {alerts.map((alert) => (
                <li key={alert.title + alert.sub} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alert.dot}`} aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{alert.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-paper lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-foreground">Activity</h2>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden />
              Live
            </span>
          </div>
          <ul className="mt-6 divide-y divide-border">
            {activity.map((item) => (
              <li key={item.initials + item.time + item.text} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-[10px] text-muted-foreground">
                  {item.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{item.text}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-foreground">Recent shipments</h2>
            <Link
              href="/dashboard/shipments"
              className="text-xs font-medium text-muted-foreground hover:text-kinetic"
            >
              View all →
            </Link>
          </div>
          <ul className="mt-6 space-y-0">
            {recentShipments.length ? (
              recentShipments.map((sh) => (
                <li
                  key={sh.id}
                  className="flex items-center justify-between gap-3 border-b border-border py-4 last:border-0"
                >
                  <div className="min-w-0">
                    <Link href={sh.href} className="font-mono text-sm font-medium text-foreground hover:text-kinetic">
                      {sh.id}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {sh.route} · ETA {sh.eta}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${sh.statusClass}`}>
                    {sh.status}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-8 text-center text-sm text-muted-foreground">No shipments in the ledger yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
