"use client";

export function AreaChartEditorial({ series = [], className = "", height = 140 }) {
  const points = series?.length ? series : [12, 18, 14, 22, 19, 28, 24, 32];
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 400;
  const h = height;
  const padX = 4;
  const padY = 8;

  const coords = points.map((v, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (w - padX * 2);
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const linePath = coords.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${h} L ${coords[0].x} ${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden
    >
      <path d={areaPath} fill="var(--foreground)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--kinetic)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
