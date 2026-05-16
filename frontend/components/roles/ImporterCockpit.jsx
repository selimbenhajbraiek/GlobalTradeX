"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleDot, FileText, LifeBuoy, Truck } from "lucide-react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { analyticsApi, shipmentsApi } from "@/lib/api";
import {
  computeImporterKpis,
  enrichShipmentRow,
} from "@/lib/role-dashboard";

import { ActiveShipmentsTable } from "./ActiveShipmentsTable";
import { RoleKpiCard } from "./RoleKpiCard";
import { ShipmentDetailPanels } from "./ShipmentDetailPanels";

function apiErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  return e?.message || "Failed to load data.";
}

export function ImporterCockpit() {
  const [shipments, setShipments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

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

  const rows = useMemo(
    () =>
      shipments
        .filter((s) => s.status !== "cancelled")
        .map(enrichShipmentRow)
        .sort((a, b) => b.progress - a.progress),
    [shipments]
  );

  const kpis = useMemo(
    () => computeImporterKpis(shipments, analytics),
    [shipments, analytics]
  );

  const selected = useMemo(
    () => shipments.find((s) => s.id === selectedId) || rows[0] || null,
    [shipments, selectedId, rows]
  );

  useEffect(() => {
    if (!selectedId && rows.length) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

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
        <p className="eyebrow">Role · Importer</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Inbound cockpit</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Track every PO from supplier handoff through customs clearance and final delivery.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoleKpiCard label="Active POs" value={kpis.activePos.value} delta={kpis.activePos.delta} up={kpis.activePos.up} icon={CircleDot} series={kpis.activePos.series} />
        <RoleKpiCard label="In customs" value={kpis.inCustoms.value} delta={kpis.inCustoms.delta} up={kpis.inCustoms.up} icon={FileText} series={kpis.inCustoms.series} positiveIsGood={false} />
        <RoleKpiCard label="Exceptions" value={kpis.exceptions.value} delta={kpis.exceptions.delta} up={kpis.exceptions.up} icon={LifeBuoy} series={kpis.exceptions.series} positiveIsGood={false} />
        <RoleKpiCard label="On-time rate" value={kpis.onTime.value} delta={kpis.onTime.delta} up={kpis.onTime.up} icon={Truck} series={kpis.onTime.series} />
      </div>

      <ActiveShipmentsTable
        title="Active POs"
        eyebrow="Inbound · this quarter"
        rows={rows}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <ShipmentDetailPanels shipment={selected} />
    </div>
  );
}
