"use client";

import { useId, useMemo, useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";

import {
  bezierRoutePath,
  interpolateLatLng,
  latLngToSvg,
  MAP_SIZE,
  modeColors,
} from "@/lib/geo";

const HUB_PORTS = [
  { label: "New York", lat: 40.7128, lng: -74.006 },
  { label: "Rotterdam", lat: 51.9225, lng: 4.4792 },
  { label: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { label: "Dubai", lat: 25.2048, lng: 55.2708 },
  { label: "Singapore", lat: 1.3521, lng: 103.8198 },
  { label: "Shanghai", lat: 31.2304, lng: 121.4737 },
  { label: "Sydney", lat: -33.8688, lng: 151.2093 },
];

const CONTINENT_LABELS = [
  { text: "NORTH AMERICA", x: 195, y: 118, size: 11 },
  { text: "EUROPE", x: 498, y: 108, size: 10 },
  { text: "AFRIKA", x: 518, y: 248, size: 10, sub: " / أفريقيا" },
  { text: "AMÉRICA DO SUL", x: 268, y: 358, size: 9 },
  { text: "ASIA", x: 718, y: 138, size: 10 },
  { text: "AUSTRALIA", x: 848, y: 358, size: 9 },
];

function hasCoords(t) {
  return (
    t?.origin_lat != null &&
    t?.origin_lng != null &&
    t?.dest_lat != null &&
    t?.dest_lng != null
  );
}

function formatClock(d) {
  try {
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function PortNode({ x, y }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={5}
      fill="#FFFFFF"
      stroke="#64748B"
      strokeWidth={1.25}
    />
  );
}

function ShipmentMarker({ p, onSelect }) {
  const colors = modeColors(p.mode);
  const coreR = p.selected ? 7 : 6;
  const ringR = coreR + 4;

  return (
    <g
      className={onSelect ? "cursor-pointer" : ""}
      onClick={() => onSelect?.(p.id)}
    >
      {p.active ? (
        <circle
          cx={p.x}
          cy={p.y}
          r={ringR}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2.5}
        />
      ) : null}
      <circle
        cx={p.x}
        cy={p.y}
        r={coreR}
        fill={colors.fill}
        stroke="#FFFFFF"
        strokeWidth={2}
      />
      {p.selected && p.reference ? (
        <text
          x={p.x}
          y={p.y - 14}
          textAnchor="middle"
          fontSize="11"
          fontFamily="var(--font-mono)"
          fill="#334155"
          fontWeight="500"
        >
          {p.reference}
        </text>
      ) : null}
    </g>
  );
}

export function ShipmentNetworkMap({
  trackings = [],
  selectedId = null,
  onSelect,
  className = "",
  minHeight = 480,
  updatedAt = null,
}) {
  const clipId = useId().replace(/:/g, "");
  const [zoom, setZoom] = useState(1);

  const { routes, positions, endpoints, inMotion, liveCount } = useMemo(() => {
    const routesOut = [];
    const positionsOut = [];
    const endpointsOut = [];
    const seenEndpoints = new Set();

    for (const t of trackings) {
      if (!hasCoords(t)) continue;

      const mode = (t.transport_mode || "sea").toLowerCase();
      const colors = modeColors(mode);

      const origin = latLngToSvg(t.origin_lat, t.origin_lng);
      const dest = latLngToSvg(t.dest_lat, t.dest_lng);
      if (!origin || !dest) continue;

      for (const ep of [
        { key: `o-${t.shipment_id}`, ...origin },
        { key: `d-${t.shipment_id}`, ...dest },
      ]) {
        const bucket = `${Math.round(ep.x)}-${Math.round(ep.y)}`;
        if (!seenEndpoints.has(bucket)) {
          seenEndpoints.add(bucket);
          endpointsOut.push(ep);
        }
      }

      const progress = Number(t.tracking_progress) || 0;
      const curLat =
        t.current_lat ??
        interpolateLatLng(
          { lat: t.origin_lat, lng: t.origin_lng },
          { lat: t.dest_lat, lng: t.dest_lng },
          progress
        ).lat;
      const curLng =
        t.current_lng ??
        interpolateLatLng(
          { lat: t.origin_lat, lng: t.origin_lng },
          { lat: t.dest_lat, lng: t.dest_lng },
          progress
        ).lng;

      const current = latLngToSvg(curLat, curLng);
      const isActive =
        ["running", "in_transit", "dispatched", "out_for_delivery"].includes(
          t.tracking_status
        ) ||
        t.simulation_state === "running" ||
        (progress > 0.02 && progress < 0.98);

      routesOut.push({
        id: t.shipment_id,
        path: bezierRoutePath(origin, dest),
        stroke: colors.stroke,
        selected: selectedId === t.shipment_id,
        active: isActive,
      });

      if (current) {
        positionsOut.push({
          id: t.shipment_id,
          reference: t.reference,
          ...current,
          progress,
          active: isActive,
          selected: selectedId === t.shipment_id,
          mode,
        });
      }
    }

    const motion = positionsOut.filter((p) => p.active).length;
    return {
      routes: routesOut,
      positions: positionsOut,
      endpoints: endpointsOut,
      inMotion: motion,
      liveCount: positionsOut.length,
    };
  }, [trackings, selectedId]);

  const hubPorts = useMemo(
    () =>
      HUB_PORTS.map((h) => ({
        ...h,
        ...latLngToSvg(h.lat, h.lng),
      })).filter((h) => h.x != null),
    []
  );

  const clock = formatClock(updatedAt || new Date());
  const displayMotion = inMotion || liveCount;

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card shadow-paper ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-kinetic" strokeWidth={1.5} aria-hidden />
          <h2 className="font-display text-sm font-medium text-foreground">Network map</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden />
          {displayMotion} in motion · live
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-b-xl bg-[#E4E7EC]"
        style={{ minHeight }}
      >
        {/* Unified zoom + live pill (screenshot) */}
        <div className="absolute start-4 top-4 z-20 flex overflow-hidden rounded-lg border border-slate-600/40 bg-[#1E293B] shadow-md">
          <div className="flex flex-col border-e border-slate-600/50">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.12).toFixed(2)))}
              className="flex h-8 w-8 items-center justify-center text-slate-100 hover:bg-slate-700/80"
              aria-label="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.88, +(z - 0.12).toFixed(2)))}
              className="flex h-8 w-8 items-center justify-center border-t border-slate-600/50 text-slate-100 hover:bg-slate-700/80"
              aria-label="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div className="flex items-center px-3 py-2">
            <span className="whitespace-nowrap font-mono text-[11px]">
              <span className="text-emerald-400">{liveCount} live</span>
              <span className="text-slate-300"> · updated {clock}</span>
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute end-4 top-4 z-20 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 shadow-sm">
          <ul className="space-y-1.5">
            {[
              { key: "sea", color: "#4F6BDF" },
              { key: "air", color: "#38BDF8" },
              { key: "road", color: "#22C55E" },
            ].map(({ key, color }) => (
              <li
                key={key}
                className="flex items-center gap-2 text-[11px] font-medium text-[#334155]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                {modeColors(key).label}
              </li>
            ))}
          </ul>
        </div>

        <svg
          viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
          className="block h-full w-full"
          style={{ minHeight: minHeight - 8 }}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Live shipment network map"
        >
          <defs>
            <clipPath id={clipId}>
              <rect width={MAP_SIZE.width} height={MAP_SIZE.height} />
            </clipPath>
          </defs>

          <g clipPath={`url(#${clipId})`}>
            <g
              transform={`translate(${MAP_SIZE.width / 2},${MAP_SIZE.height / 2}) scale(${zoom}) translate(${-MAP_SIZE.width / 2},${-MAP_SIZE.height / 2})`}
              style={{ transition: "transform 0.2s ease-out" }}
            >
              <image
                href="/maps/world-base.svg"
                x={0}
                y={0}
                width={MAP_SIZE.width}
                height={MAP_SIZE.height}
                preserveAspectRatio="xMidYMid meet"
              />

              {CONTINENT_LABELS.map((label) => (
                <text
                  key={label.text}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  fontSize={label.size}
                  fill="#94A3B8"
                  fontFamily="var(--font-sans)"
                  fontWeight={500}
                  letterSpacing="0.14em"
                  pointerEvents="none"
                >
                  {label.text}
                  {label.sub ? (
                    <tspan fontSize={label.size - 1} dx="2">
                      {label.sub}
                    </tspan>
                  ) : null}
                </text>
              ))}

              {routes.map((r) => (
                <path
                  key={r.id}
                  d={r.path}
                  fill="none"
                  stroke={r.stroke}
                  strokeWidth={r.selected ? 2 : 1.5}
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                  opacity={r.selected ? 0.95 : r.active ? 0.8 : 0.45}
                  className={r.active ? "animate-dash" : undefined}
                />
              ))}

              {hubPorts.map((hub) => (
                <PortNode key={hub.label} x={hub.x} y={hub.y} />
              ))}

              {endpoints.map((ep) => (
                <PortNode key={ep.key} x={ep.x} y={ep.y} />
              ))}

              {positions.map((p) => (
                <ShipmentMarker key={p.id} p={p} onSelect={onSelect} />
              ))}
            </g>
          </g>
        </svg>

        {trackings.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center bg-white/70 px-6 text-center text-sm text-muted-foreground backdrop-blur-[1px]">
            No GPS-tracked shipments yet. Initialize tracking on a shipment or seed demo routes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
