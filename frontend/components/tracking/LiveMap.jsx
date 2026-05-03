"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    try {
      const b = L.latLngBounds(points);
      map.fitBounds(b, { padding: [48, 48], maxZoom: 11 });
    } catch {
      // ignore invalid bounds
    }
  }, [map, points]);
  return null;
}

const TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * @param {{ shipment_id: number, location_history?: {lat:number,lng:number}[], current_lat?: number|null, current_lng?: number|null, origin_lat?: number|null, origin_lng?: number|null, dest_lat?: number|null, dest_lng?: number|null, reference?: string }} state
 */
export function LiveMapSingle({ state, height = 400 }) {
  const { path, origin, dest, cur, fitPts, center } = useMemo(() => {
    const pathArr = (state.location_history || []).map((p) => [p.lat, p.lng]);
    const o =
      state.origin_lat != null && state.origin_lng != null ? [state.origin_lat, state.origin_lng] : null;
    const d = state.dest_lat != null && state.dest_lng != null ? [state.dest_lat, state.dest_lng] : null;
    const c = state.current_lat != null && state.current_lng != null ? [state.current_lat, state.current_lng] : null;
    const pts = [];
    if (o) pts.push(o);
    if (d) pts.push(d);
    if (c) pts.push(c);
    pathArr.forEach((p) => pts.push(p));
    return {
      path: pathArr,
      origin: o,
      dest: d,
      cur: c,
      fitPts: pts,
      center: c || o || [36.8065, 10.1815],
    };
  }, [state]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-sm" style={{ height }}>
      <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={ATTR} url={TILE} />
        {fitPts.length ? <FitBounds points={fitPts} /> : null}
        {path.length >= 2 ? (
          <Polyline positions={path} pathOptions={{ color: "#c9a227", weight: 4, opacity: 0.9 }} />
        ) : null}
        {origin ? (
          <CircleMarker
            center={origin}
            radius={7}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.85 }}
          />
        ) : null}
        {dest ? (
          <CircleMarker
            center={dest}
            radius={7}
            pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.85 }}
          />
        ) : null}
        {cur ? (
          <CircleMarker
            center={cur}
            radius={9}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.95 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

/**
 * @param {{ shipments: Array<{ shipment_id: number, location_history?: {lat:number,lng:number}[], current_lat?: number|null, current_lng?: number|null, origin_lat?: number|null, origin_lng?: number|null, dest_lat?: number|null, dest_lng?: number|null, reference?: string }> }} props
 */
export function LiveMapOverview({ shipments, height = 440 }) {
  const fitPts = useMemo(() => {
    const pts = [];
    for (const s of shipments || []) {
      for (const p of s.location_history || []) pts.push([p.lat, p.lng]);
      if (s.current_lat != null && s.current_lng != null) pts.push([s.current_lat, s.current_lng]);
      if (s.origin_lat != null && s.origin_lng != null) pts.push([s.origin_lat, s.origin_lng]);
      if (s.dest_lat != null && s.dest_lng != null) pts.push([s.dest_lat, s.dest_lng]);
    }
    return pts;
  }, [shipments]);

  const center = fitPts[0] || [38, 12];

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-sm" style={{ height }}>
      <MapContainer center={center} zoom={4} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={ATTR} url={TILE} />
        {fitPts.length ? <FitBounds points={fitPts} /> : null}
        {(shipments || []).map((s, i) => {
          const pts = (s.location_history || []).map((p) => [p.lat, p.lng]);
          if (pts.length < 2) return null;
          const hue = (i * 67) % 360;
          return (
            <Polyline
              key={s.shipment_id}
              positions={pts}
              pathOptions={{ color: `hsl(${hue} 65% 48%)`, weight: 3, opacity: 0.9 }}
            />
          );
        })}
        {(shipments || []).map((s, i) => {
          if (s.current_lat == null || s.current_lng == null) return null;
          const hue = (i * 67) % 360;
          return (
            <CircleMarker
              key={`m-${s.shipment_id}`}
              center={[s.current_lat, s.current_lng]}
              radius={8}
              pathOptions={{ color: `hsl(${hue} 70% 40%)`, fillColor: `hsl(${hue} 70% 50%)`, fillOpacity: 0.95 }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
