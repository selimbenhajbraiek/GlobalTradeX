const tone = {
  pending: "bg-mist/15 text-mist border-mist/25",
  draft: "bg-mist/15 text-mist border-mist/25",
  in_transit: "bg-sea/15 text-sea border-sea/30",
  customs_hold: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
  delayed: "bg-orange-500/12 text-orange-200 border-orange-400/25",
  cancelled: "bg-red-500/10 text-red-200 border-red-400/25",
  default: "bg-brass/10 text-brass border-brass/25",
};

export function StatusBadge({ status }) {
  const key = (status || "").toLowerCase().replace(/\s+/g, "_");
  const cls = tone[key] || tone.default;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}
