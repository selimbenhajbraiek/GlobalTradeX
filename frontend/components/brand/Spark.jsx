export function Spark({ data, className = "", width = 80, height = 24 }) {
  const points = data?.length ? data : [4, 8, 6, 12, 10, 16, 14, 20, 18, 22];
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = width;
  const h = height;
  const pad = 2;

  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${coords.join(" L ")}`;
  const areaPath = `${linePath} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <path d={areaPath} fill="var(--kinetic)" fillOpacity="0.08" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--kinetic)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
