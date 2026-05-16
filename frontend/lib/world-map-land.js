/** Simplified land silhouettes for 100×80 equirectangular SVG viewBox */

export const MAP_COLORS = {
  ocean: "#E6E9EF",
  land: "#F7F6F2",
  landStroke: "#D9D5CD",
  graticule: "#DDE1E8",
};

export const LAND_PATHS = [
  "M 10,20 C 12,14 26,12 34,15 L 37,22 36,30 30,36 20,38 11,34 8,26 Z",
  "M 28,11 L 37,9 38,15 32,17 Z",
  "M 22,40 L 31,38 35,50 33,62 25,66 20,56 Z",
  "M 45,23 L 53,21 55,27 51,31 46,30 Z",
  "M 45,31 L 57,29 60,47 54,57 47,55 43,42 Z",
  "M 54,17 L 81,15 89,21 91,37 79,43 64,41 56,34 Z",
  "M 67,37 L 74,35 76,43 70,45 Z",
  "M 77,53 L 89,51 91,61 83,65 75,61 Z",
  "M 62,48 L 68,47 69,52 63,53 Z",
];

export const CONTINENT_LABELS = [
  { text: "NORTH AMERICA", x: 20, y: 26, size: 2.4 },
  { text: "EUROPE", x: 49, y: 24, size: 2.2 },
  { text: "AFRIKA", x: 51, y: 42, size: 2.2, sub: " / أفريقيا" },
  { text: "ASIA", x: 72, y: 28, size: 2.4 },
];

export const MODE_STYLES = {
  sea: { stroke: "var(--kinetic)", fill: "var(--kinetic)", label: "Ocean" },
  ocean: { stroke: "var(--kinetic)", fill: "var(--kinetic)", label: "Ocean" },
  air: { stroke: "var(--chart-2)", fill: "var(--chart-2)", label: "Air" },
  road: { stroke: "var(--success)", fill: "var(--success)", label: "Road" },
  rail: { stroke: "var(--muted-foreground)", fill: "var(--muted-foreground)", label: "Rail" },
};

export function modeStyle(mode) {
  const key = (mode || "sea").toLowerCase();
  return MODE_STYLES[key] || MODE_STYLES.sea;
}
