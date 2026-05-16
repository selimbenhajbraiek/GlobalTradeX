export function KpiSparkArea({ className = "", width = 120, height = 40, data }) {
  const points = data?.length ? data : [12, 18, 14, 22, 19, 28, 24, 32, 27, 36];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const pad = 0;
  const w = width;
  const h = height;

  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${coords.join(" L ")}`;
  const areaPath = `${linePath} L ${w - pad},${h} L ${pad},${h} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} fill="var(--foreground)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--kinetic)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThroughputChart({ className = "", data }) {
  const points = data?.length ? data : [40, 52, 48, 60, 55, 70, 65, 80, 75, 90];
  const w = 400;
  const h = 140;
  const pad = 8;
  const max = Math.max(...points, 1);
  const coords = points.map((v, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${line} L ${w - pad} ${h} L ${pad} ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${className}`} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill="var(--foreground)" />
      <path d={line} fill="none" stroke="var(--kinetic)" strokeWidth="2.5" />
    </svg>
  );
}
