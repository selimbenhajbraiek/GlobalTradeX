export function KPICard({ label, value, hint }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-panel/60 p-5 shadow-lift">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brass/10 blur-2xl" />
      <p className="text-xs font-medium uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-[var(--text)]">{value}</p>
      {hint ? <p className="mt-2 text-xs text-mist">{hint}</p> : null}
    </div>
  );
}
