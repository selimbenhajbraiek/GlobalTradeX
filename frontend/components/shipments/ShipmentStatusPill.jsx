const STYLES = {
  in_transit: "bg-kinetic/10 text-kinetic",
  dispatched: "bg-chart-2/15 text-chart-2",
  out_for_delivery: "bg-kinetic/15 text-kinetic",
  customs_hold: "bg-warning/15 text-warning",
  customs: "bg-warning/15 text-warning",
  delivered: "bg-success/10 text-success",
  pending: "bg-muted text-muted-foreground",
  booked: "bg-muted text-muted-foreground",
  delayed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const LABELS = {
  in_transit: "In transit",
  dispatched: "Departed",
  out_for_delivery: "Out for delivery",
  customs_hold: "Customs",
  customs: "Customs",
  delivered: "Delivered",
  pending: "Booked",
  booked: "Booked",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

export function ShipmentStatusPill({ status, trackingStatus }) {
  const key = (trackingStatus || status || "pending").toLowerCase().replace(/\s+/g, "_");
  const cls = STYLES[key] || STYLES.pending;
  const label = LABELS[key] || key.replace(/_/g, " ");

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}
