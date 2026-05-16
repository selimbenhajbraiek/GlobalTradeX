/** Equirectangular projection aligned with public/maps/world-base.svg (1000×500) */
export const MAP_SIZE = { width: 1000, height: 500 };

export function latLngToSvg(lat, lng, width = MAP_SIZE.width, height = MAP_SIZE.height) {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return {
    x: ((Number(lng) + 180) / 360) * width,
    y: ((90 - Number(lat)) / 180) * height,
  };
}

export function interpolateLatLng(origin, dest, progress) {
  const t = Math.max(0, Math.min(1, progress ?? 0));
  return {
    lat: origin.lat + (dest.lat - origin.lat) * t,
    lng: origin.lng + (dest.lng - origin.lng) * t,
  };
}

/** Great-circle style arc in SVG space */
export function bezierRoutePath(from, to) {
  if (!from || !to) return "";
  const mx = (from.x + to.x) / 2;
  const dy = to.y - from.y;
  const lift = Math.min(-80, Math.max(-24, -Math.abs(dy) * 0.35 - 28));
  const my = Math.min(from.y, to.y) + lift;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export const MODE_COLORS = {
  sea: { stroke: "#4F6BDF", fill: "#4F6BDF", label: "Ocean" },
  ocean: { stroke: "#4F6BDF", fill: "#4F6BDF", label: "Ocean" },
  air: { stroke: "#38BDF8", fill: "#38BDF8", label: "Air" },
  road: { stroke: "#22C55E", fill: "#22C55E", label: "Road" },
  rail: { stroke: "#94A3B8", fill: "#94A3B8", label: "Rail" },
};

export function modeColors(mode) {
  const key = (mode || "sea").toLowerCase();
  return MODE_COLORS[key] || MODE_COLORS.sea;
}

function shortPlace(place) {
  if (!place || typeof place !== "string") return "";
  const parts = place.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[0] || place.slice(0, 28);
}

export function formatLane(origin, destination) {
  const o = shortPlace(origin);
  const d = shortPlace(destination);
  if (!o && !d) return "—";
  if (o && d) return `${o} → ${d}`;
  return o || d;
}

export function formatEta(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
