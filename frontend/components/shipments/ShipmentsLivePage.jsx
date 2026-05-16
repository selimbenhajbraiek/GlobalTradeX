"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Filter, Plus } from "lucide-react";

import { ShipmentNetworkMap } from "@/components/tracking/ShipmentNetworkMap";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { formatEta, formatLane } from "@/lib/geo";
import { shipmentsApi, trackingApi } from "@/lib/api";

import { ShipmentStatusPill } from "./ShipmentStatusPill";

const POLL_MS = 3000;

const MODE_LABEL = {
  sea: "Ocean",
  air: "Air",
  road: "Road",
  rail: "Rail",
};

function apiErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  return e?.message || "Failed to load shipments.";
}

function carrierLabel(row) {
  if (row.vessel_name) return row.vessel_name;
  if (row.voyage_number) return row.voyage_number;
  const mode = (row.transport_mode || row.tracking?.transport_mode || "sea").toLowerCase();
  if (mode === "air") return "Air freight";
  if (mode === "road") return "Road freight";
  if (mode === "rail") return "Rail freight";
  return "Ocean freight";
}

function progressPercent(row, tracking) {
  if (tracking?.tracking_progress != null) {
    return Math.round(Number(tracking.tracking_progress) * 100);
  }
  if (row.status === "delivered") return 100;
  if (row.status === "in_transit") return 55;
  if (row.status === "customs_hold") return 72;
  return 12;
}

function mergeRows(shipments, trackings) {
  const byId = new Map((trackings || []).map((t) => [t.shipment_id, t]));
  return (shipments || []).map((s) => ({
    ...s,
    tracking: byId.get(s.id) || null,
  }));
}

export function ShipmentsLivePage() {
  const { user } = useAuth();
  const role = user?.role || "";
  const canSeed = ["admin", "importateur", "exportateur"].includes(role);

  const [shipments, setShipments] = useState([]);
  const [trackings, setTrackings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seedMsg, setSeedMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const autoStartedRef = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const [shipRes, trackRes] = await Promise.all([
        shipmentsApi.getAll(),
        trackingApi.active(),
      ]);
      setShipments(Array.isArray(shipRes.data) ? shipRes.data : []);
      setTrackings(Array.isArray(trackRes.data) ? trackRes.data : []);
      setLastUpdated(new Date());
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
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  /** Start idle GPS simulations so map positions update (uses existing tracking API). */
  useEffect(() => {
    for (const t of trackings) {
      if (t.simulation_state !== "idle") continue;
      if (t.origin_lat == null || t.dest_lat == null) continue;
      if (autoStartedRef.current.has(t.shipment_id)) continue;
      autoStartedRef.current.add(t.shipment_id);
      trackingApi.start(t.shipment_id).catch(() => {});
    }
  }, [trackings]);

  async function seedDemos() {
    setSeedMsg("");
    try {
      const { data } = await trackingApi.seedDemos();
      setSeedMsg(data?.message || "Demo shipments created.");
      await load();
    } catch (e) {
      setError(apiErr(e));
    }
  }

  const rows = useMemo(() => mergeRows(shipments, trackings), [shipments, trackings]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => {
      const st = (r.tracking?.tracking_status || r.status || "").toLowerCase();
      if (statusFilter === "in_transit") return st.includes("transit") || st === "dispatched";
      if (statusFilter === "customs") return st.includes("customs");
      return st === statusFilter;
    });
  }, [rows, statusFilter]);

  const mapTrackings = useMemo(() => {
    const modeById = new Map(rows.map((r) => [r.id, r.transport_mode || "sea"]));
    const list = selectedId
      ? trackings.filter((t) => t.shipment_id === selectedId)
      : trackings;
    return list.map((t) => ({
      ...t,
      transport_mode: modeById.get(t.shipment_id) || "sea",
    }));
  }, [trackings, selectedId, rows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground md:text-[2.75rem]">
            Live shipments
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every container, pallet and parcel — one ledger across modes and carriers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="btn-secondary"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Filter
            </button>
            {filterOpen ? (
              <div className="absolute end-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-card p-1 shadow-elevated">
                {[
                  ["all", "All"],
                  ["in_transit", "In transit"],
                  ["customs", "Customs"],
                  ["delivered", "Delivered"],
                  ["pending", "Booked"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`block w-full rounded-md px-3 py-2 text-start text-sm ${
                      statusFilter === val ? "bg-accent font-medium" : "hover:bg-muted"
                    }`}
                    onClick={() => {
                      setStatusFilter(val);
                      setFilterOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Link href="/dashboard/shipments/new" className="btn-primary">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New shipment
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {seedMsg ? <p className="text-sm text-success">{seedMsg}</p> : null}

      {loading && !shipments.length ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner className="h-8 w-8 border-2 border-kinetic/30 border-t-kinetic" />
        </div>
      ) : (
        <>
          {canSeed && trackings.length === 0 ? (
            <p className="text-sm">
              <button type="button" onClick={seedDemos} className="text-kinetic hover:underline">
                Seed demo GPS routes
              </button>
              <span className="text-muted-foreground"> to populate the network map.</span>
            </p>
          ) : null}

          <ShipmentNetworkMap
            trackings={mapTrackings}
            selectedId={selectedId}
            onSelect={setSelectedId}
            minHeight={460}
            updatedAt={lastUpdated}
          />

          {selectedId ? (
            <p className="text-center text-xs text-muted-foreground">
              <button
                type="button"
                className="text-kinetic hover:underline"
                onClick={() => setSelectedId(null)}
              >
                Show all routes on map
              </button>
            </p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Shipment", "Lane", "Carrier", "Mode", "Progress", "ETA", "Status"].map((h) => (
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
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                        No shipments match this filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const pct = progressPercent(row, row.tracking);
                      const eta =
                        row.tracking?.estimated_delivery_at ||
                        row.arrival_date ||
                        row.eta_update;
                      const isSelected = selectedId === row.id;

                      return (
                        <tr
                          key={row.id}
                          className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                            isSelected ? "bg-kinetic/5" : ""
                          }`}
                          onClick={() => setSelectedId(isSelected ? null : row.id)}
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <Link
                              href={`/dashboard/shipments/${row.id}`}
                              className="font-mono text-sm font-medium text-foreground hover:text-kinetic"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.reference}
                            </Link>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-foreground">
                              {formatLane(row.origin, row.destination)}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {row.origin} → {row.destination}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-foreground">
                            {carrierLabel(row)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                              {MODE_LABEL[row.transport_mode] || row.transport_mode}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex min-w-[100px] items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full gradient-kinetic transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted-foreground">
                            {formatEta(eta)}
                          </td>
                          <td className="px-5 py-4">
                            <ShipmentStatusPill
                              status={row.status}
                              trackingStatus={row.tracking?.tracking_status}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Click a row to highlight its route on the map.{" "}
            <Link href="/dashboard/shipments/tracking" className="text-kinetic hover:underline">
              Open GPS controls
              <ArrowRight className="ms-1 inline h-3 w-3" aria-hidden />
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
