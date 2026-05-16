"use client";

const NODES = [
  { id: "nyc", label: "New York", cx: 22, cy: 38 },
  { id: "rtm", label: "Rotterdam", cx: 48, cy: 32 },
  { id: "dxb", label: "Dubai", cx: 58, cy: 42 },
  { id: "sgp", label: "Singapore", cx: 72, cy: 52 },
  { id: "sha", label: "Shanghai", cx: 78, cy: 38 },
  { id: "syd", label: "Sydney", cx: 84, cy: 68 },
  { id: "gru", label: "São Paulo", cx: 30, cy: 62 },
];

const ROUTES = [
  ["nyc", "rtm"],
  ["rtm", "dxb"],
  ["dxb", "sgp"],
  ["sgp", "sha"],
  ["rtm", "sgp"],
  ["nyc", "gru"],
  ["sgp", "syd"],
];

function nodeById(id) {
  return NODES.find((n) => n.id === id);
}

function routePath(from, to) {
  const a = nodeById(from);
  const b = nodeById(to);
  if (!a || !b) return "";
  const mx = (a.cx + b.cx) / 2;
  const my = Math.min(a.cy, b.cy) - 12;
  return `M ${a.cx} ${a.cy} Q ${mx} ${my} ${b.cx} ${b.cy}`;
}

export function WorldMap({ className = "", compact = false }) {
  const h = compact ? 280 : 400;

  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.55 0.22 270 / 0.12), transparent 70%)",
        }}
        aria-hidden
      />
      <svg
        viewBox="0 0 100 80"
        className="relative w-full animate-float"
        style={{ maxHeight: h }}
        role="img"
        aria-label="Global trade network map"
      >
        <defs>
          <pattern id="map-dots" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.35" fill="oklch(0.14 0.01 265 / 0.12)" />
          </pattern>
        </defs>
        <ellipse cx="24" cy="36" rx="14" ry="10" fill="url(#map-dots)" opacity="0.9" />
        <ellipse cx="48" cy="34" rx="10" ry="8" fill="url(#map-dots)" opacity="0.85" />
        <ellipse cx="30" cy="58" rx="9" ry="11" fill="url(#map-dots)" opacity="0.8" />
        <ellipse cx="72" cy="48" rx="16" ry="12" fill="url(#map-dots)" opacity="0.9" />
        <ellipse cx="84" cy="66" rx="6" ry="5" fill="url(#map-dots)" opacity="0.75" />
        {ROUTES.map(([from, to], i) => (
          <path
            key={`${from}-${to}`}
            d={routePath(from, to)}
            fill="none"
            stroke="var(--kinetic)"
            strokeWidth="0.35"
            strokeDasharray="1.2 1.2"
            strokeLinecap="round"
            opacity="0.65"
            className="animate-dash"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
        {NODES.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.cx}
              cy={node.cy}
              r="2.8"
              fill="var(--kinetic)"
              className="animate-pulse-ring"
            />
            <circle cx={node.cx} cy={node.cy} r="1" fill="var(--kinetic-foreground)" />
            {!compact && (
              <text
                x={node.cx}
                y={node.cy + 4.5}
                textAnchor="middle"
                fontSize="2.2"
                fill="var(--muted-foreground)"
                fontFamily="var(--font-mono)"
              >
                {node.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function WorldMapHeroCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-paper">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
          GLOBALTRADEX.APP/NETWORK
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          live
        </span>
      </div>
      <div className="p-4 pb-20">
        <WorldMap />
      </div>
      <div className="absolute bottom-4 left-4 w-[min(200px,45%)] rounded-lg border border-border bg-card p-3 shadow-elevated">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] text-muted-foreground">TRK · GTX-9921</span>
          <span className="rounded-full bg-success/10 px-1.5 py-0.5 font-mono text-[8px] text-success">
            In transit
          </span>
        </div>
        <p className="mt-1.5 text-xs font-medium text-foreground">Rotterdam → Singapore</p>
        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">ETA · Oct 24</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-kinetic" />
        </div>
      </div>
      <div className="absolute bottom-4 right-4 rounded-lg border border-border bg-card px-3 py-2 shadow-elevated">
        <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          Customs SLA
        </p>
        <p className="font-mono text-lg tabular-nums text-foreground">4h 12m</p>
        <p className="font-mono text-[9px] text-success">-18m</p>
      </div>
    </div>
  );
}
