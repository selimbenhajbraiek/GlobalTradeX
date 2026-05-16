const STYLES = {
  "Pending review": "bg-warning/15 text-warning",
  Approved: "bg-success/10 text-success",
  "AI verified": "bg-kinetic/10 text-kinetic",
  "Hold - docs": "bg-warning/20 text-warning",
};

export function DeclarationStatusPill({ status }) {
  const cls = STYLES[status] || STYLES["Pending review"];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {status}
    </span>
  );
}
