import { formatEta, formatLane } from "@/lib/geo";

export function poNumber(shipment) {
  return `PO-${String(shipment.id).padStart(5, "0")}`;
}

export function supplierLabel(shipment) {
  if (shipment.notes?.trim()) {
    const line = shipment.notes.split("\n")[0].trim();
    if (line.length < 48) return line;
  }
  const origin = (shipment.origin || "").split(",")[0].trim();
  if (origin) return origin;
  return "Supplier pending";
}

export function progressPercent(shipment) {
  if (shipment.tracking_progress != null && shipment.tracking_progress > 0) {
    return Math.round(Number(shipment.tracking_progress) * 100);
  }
  const s = String(shipment.status || "").toLowerCase();
  if (s === "delivered") return 100;
  if (s === "in_transit") return 66;
  if (s === "customs_hold") return 72;
  if (s === "delayed") return 45;
  if (s === "pending") return 18;
  return 32;
}

export function formatMoneyCompact(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${Math.round(num / 1_000)}K`;
  return `$${Math.round(num)}`;
}

export function formatMoney(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function momLabel(percent, suffix = "MoM") {
  const p = Number(percent);
  if (Number.isNaN(p)) return `— ${suffix}`;
  const sign = p > 0 ? "+" : "";
  return `${sign}${p}% ${suffix}`;
}

function seriesFromMonthly(byMonth, fallback = 0) {
  if (!byMonth?.length) return [fallback];
  return byMonth.map((m) => Number(m.count) || 0);
}

function revenueSeriesFromMonthly(byMonth) {
  if (!byMonth?.length) return [0];
  return byMonth.map((m) => Number(m.revenue) || 0);
}

export function buildTimeline(shipment) {
  const ref = shipment.reference || "—";
  const vessel =
    shipment.vessel_name ||
    (shipment.transport_mode === "air" ? "Air carrier" : "Ocean carrier");
  const created = shipment.created_at ? new Date(shipment.created_at) : new Date();
  const eta = shipment.arrival_date || shipment.eta_update || shipment.estimated_delivery_at;

  return [
    {
      time: created,
      title: "Booking confirmed",
      sub: `Reference ${ref}`,
      done: true,
    },
    {
      time: addDays(created, 2),
      title: "Departed origin",
      sub: shipment.origin || "Origin port",
      done: ["in_transit", "customs_hold", "delivered", "delayed"].includes(shipment.status),
    },
    {
      time: addDays(created, 8),
      title: "In transit",
      sub: vessel,
      done: ["in_transit", "customs_hold", "delivered"].includes(shipment.status),
    },
    {
      time: eta ? new Date(eta) : addDays(created, 18),
      title: `Arrival ${(shipment.destination || "").split(",")[0] || "destination"}`,
      sub: formatEta(eta),
      done: shipment.status === "delivered",
      future: shipment.status !== "delivered",
    },
    {
      time: addDays(created, 20),
      title: "Customs cleared",
      sub: shipment.status === "customs_hold" ? "Awaiting release" : "Entry filed & released",
      done: shipment.status === "delivered",
      future: !["delivered", "customs_hold"].includes(shipment.status),
    },
  ];
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function formatTimelineDate(d) {
  try {
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function enrichShipmentRow(s) {
  const reference = s.reference || s.reference_number || `GTX-${String(s.id).padStart(4, "0")}`;
  return {
    ...s,
    reference,
    po: poNumber(s),
    supplier: supplierLabel(s),
    lane: formatLane(s.origin, s.destination),
    laneFull: `${s.origin} → ${s.destination}`,
    progress: progressPercent(s),
    eta: formatEta(s.arrival_date || s.eta_update || s.estimated_delivery_at),
  };
}

export function computeImporterKpis(shipments, analytics) {
  const active = shipments.filter((s) => !["delivered", "cancelled"].includes(s.status));
  const customs = shipments.filter((s) => s.status === "customs_hold");
  const exceptions = shipments.filter((s) => ["delayed", "customs_hold"].includes(s.status));
  const delivered = shipments.filter((s) => s.status === "delivered").length;
  const onTime = shipments.length
    ? Math.round((delivered / shipments.length) * 1000) / 10
    : 0;

  const monthSeries = seriesFromMonthly(analytics?.by_month, active.length);
  const weekDelta = analytics?.delivered_this_month
    ? `${analytics.delivered_this_month} delivered this month`
    : `${active.length} active`;

  return {
    activePos: {
      value: String(active.length || analytics?.active_shipments || 0),
      delta: weekDelta,
      up: true,
      series: monthSeries,
    },
    inCustoms: {
      value: String(customs.length),
      delta: customs.length ? `${customs.length} awaiting clearance` : "No holds",
      up: customs.length === 0,
      series: monthSeries.map((n) => Math.max(0, Math.round(n * 0.15))),
    },
    exceptions: {
      value: String(exceptions.length),
      delta: exceptions.length ? "Needs attention" : "All clear",
      up: exceptions.length === 0,
      series: monthSeries.map((n) => Math.max(0, Math.round(n * 0.08))),
    },
    onTime: {
      value: shipments.length ? `${onTime}%` : "—",
      delta: analytics?.delivered_today ? `${analytics.delivered_today} today` : "On track",
      up: true,
      series: monthSeries,
    },
  };
}

export function computeExporterKpis(shipments, analytics) {
  const outbound = shipments.filter((s) => s.status !== "cancelled");
  const revenue = outbound.reduce((a, s) => a + (Number(s.estimated_value) || 0), 0);
  const buyers = new Set(outbound.map((s) => s.destination).filter(Boolean));
  const revSeries = revenueSeriesFromMonthly(analytics?.revenue_by_month);
  const prevRev = revSeries.length >= 2 ? revSeries[revSeries.length - 2] : 0;
  const curRev = revSeries.length ? revSeries[revSeries.length - 1] : revenue;
  const revMom =
    prevRev > 0 ? Math.round(((curRev - prevRev) / prevRev) * 1000) / 10 : 0;

  const monthCounts = seriesFromMonthly(analytics?.by_month, outbound.length);
  const prevCount = monthCounts.length >= 2 ? monthCounts[monthCounts.length - 2] : 0;
  const curCount = monthCounts.length ? monthCounts[monthCounts.length - 1] : outbound.length;
  const shipMom =
    prevCount > 0 ? Math.round(((curCount - prevCount) / prevCount) * 1000) / 10 : 0;

  const deliveredRate = outbound.length
    ? Math.round(
        (outbound.filter((s) => s.status === "delivered").length / outbound.length) * 100
      )
    : 0;

  return {
    outbound: {
      value: String(outbound.length),
      delta: momLabel(shipMom),
      up: shipMom >= 0,
      series: monthCounts,
    },
    revenue: {
      value: formatMoneyCompact(revenue),
      delta: momLabel(revMom),
      up: revMom >= 0,
      series: revSeries.length ? revSeries : [revenue],
    },
    buyers: {
      value: String(buyers.size),
      delta: buyers.size ? `${buyers.size} destinations` : "No lanes yet",
      up: true,
      series: monthCounts,
    },
    retention: {
      value: outbound.length ? `${deliveredRate}%` : "—",
      delta: "Delivered share",
      up: deliveredRate >= 50,
      series: monthCounts,
    },
    revenue12m: revSeries.length ? revSeries : [revenue],
  };
}

export function topCustomersFromShipments(shipments) {
  const map = new Map();
  for (const s of shipments) {
    const key = (s.destination || "Unknown").split(",")[0].trim();
    if (!map.has(key)) {
      map.set(key, { name: key, volume: 0, revenue: 0, count: 0, delivered: 0 });
    }
    const row = map.get(key);
    row.volume += Number(s.volume_m3) || 0;
    row.revenue += Number(s.estimated_value) || 0;
    row.count += 1;
    if (s.status === "delivered") row.delivered += 1;
  }

  return [...map.values()]
    .map((r) => {
      const rate = r.delivered / Math.max(r.count, 1);
      return {
        name: r.name,
        region: regionFor(r.name),
        volume: Math.round(r.volume) || r.count * 40,
        revenue: formatMoneyCompact(r.revenue),
        trend: rate >= 0.6 ? "On track" : rate >= 0.3 ? "In progress" : "At risk",
        trendUp: rate >= 0.5,
        status: r.count > 0 ? "Active" : "Inactive",
      };
    })
    .sort(
      (a, b) =>
        parseFloat(b.revenue.replace(/[^0-9.]/g, "") || 0) -
        parseFloat(a.revenue.replace(/[^0-9.]/g, "") || 0)
    )
    .slice(0, 5);
}

export function exporterRecommendations(shipments) {
  const recs = [];
  const delayed = shipments.filter((s) => s.status === "delayed");
  const customs = shipments.filter((s) => s.status === "customs_hold");
  const topLane = topCustomersFromShipments(shipments)[0];

  if (delayed.length) {
    recs.push({
      kind: "Risk",
      tone: "text-warning",
      text: `${delayed.length} shipment${delayed.length > 1 ? "s" : ""} delayed — review ETAs and notify buyers.`,
    });
  }
  if (customs.length) {
    recs.push({
      kind: "Compliance",
      tone: "text-warning",
      text: `${customs.length} in customs hold — ensure documents are verified before release.`,
    });
  }
  if (topLane) {
    recs.push({
      kind: "Lane",
      tone: "text-kinetic",
      text: `Top lane ${topLane.name} — ${topLane.revenue} declared value across active bookings.`,
    });
  }
  const pending = shipments.filter((s) => s.status === "pending");
  if (pending.length && recs.length < 3) {
    recs.push({
      kind: "Action",
      tone: "text-kinetic",
      text: `${pending.length} booking${pending.length > 1 ? "s" : ""} pending dispatch — confirm carrier assignments.`,
    });
  }
  if (!recs.length) {
    recs.push({
      kind: "Status",
      tone: "text-muted-foreground",
      text: "No exceptions on your outbound ledger. Monitor shipments for status changes.",
    });
  }
  return recs.slice(0, 3);
}

function regionFor(name) {
  const n = name.toLowerCase();
  if (n.includes("rotterdam") || n.includes("hamburg") || n.includes("paris") || n.includes("eu")) {
    return "EU Europe";
  }
  if (n.includes("york") || n.includes("angeles") || n.includes("miami")) {
    return "US United States";
  }
  if (n.includes("singapore") || n.includes("shanghai") || n.includes("dubai")) {
    return "APAC";
  }
  return "Global";
}

export function computeCustomsKpis(pending, verifiedToday, shipments, docAnalytics) {
  const hold = shipments.filter((s) => s.status === "customs_hold").length;
  const pendingCount = pending.length || hold;
  const aiRate = docAnalytics?.total_documents
    ? Math.round(
        ((docAnalytics.verified || 0) / Math.max(docAnalytics.total_documents, 1)) * 1000
      ) / 10
    : null;

  return {
    pending: {
      value: String(pendingCount),
      delta: pendingCount ? `${pendingCount} in queue` : "Queue clear",
      up: pendingCount === 0,
      series: [pendingCount, pendingCount, pendingCount, pendingCount, pendingCount, pendingCount],
    },
    approved: {
      value: String(verifiedToday),
      delta: verifiedToday ? `${verifiedToday} verified today` : "None today",
      up: verifiedToday > 0,
      series: [0, verifiedToday, verifiedToday, verifiedToday, verifiedToday, verifiedToday],
    },
    compliance: {
      value: aiRate != null ? `${aiRate}%` : "—",
      delta: docAnalytics?.pending_review
        ? `${docAnalytics.pending_review} pending review`
        : "Document compliance",
      up: (aiRate ?? 0) >= 80,
      series: aiRate != null ? [aiRate - 10, aiRate - 5, aiRate, aiRate, aiRate, aiRate] : [0],
    },
    exceptions: {
      value: String(hold),
      delta: hold ? `${hold} shipments on hold` : "No shipment holds",
      up: hold === 0,
      series: [hold, hold, hold, hold, hold, hold],
    },
  };
}

export function customsAlertsFromData(pending, shipments) {
  const alerts = [];
  const holdShipments = shipments.filter((s) => s.status === "customs_hold");
  for (const s of holdShipments.slice(0, 2)) {
    alerts.push({
      border: "border-warning",
      text: `${s.reference || "Shipment"} on customs hold — ${s.origin || ""} → ${s.destination || ""}.`,
    });
  }
  for (const doc of pending.filter((d) => d.ai_result && !d.is_verified).slice(0, 2)) {
    const note = doc.ai_result?.notes || doc.ai_result?.summary || "Review required";
    alerts.push({
      border: "border-kinetic",
      text: `${doc.shipment_reference || doc.original_name}: ${String(note).slice(0, 120)}`,
    });
  }
  if (!alerts.length && pending.length) {
    alerts.push({
      border: "border-kinetic",
      text: `${pending.length} document${pending.length > 1 ? "s" : ""} awaiting broker review.`,
    });
  }
  if (!alerts.length) {
    alerts.push({
      border: "border-success",
      text: "No urgent compliance exceptions in your queue.",
    });
  }
  return alerts.slice(0, 4);
}

export function declarationFromDoc(doc) {
  const ai = doc.ai_result || {};
  const hs = ai.hs_code || ai.hsCode || doc.file_type || "—";
  const value = ai.declared_value ?? ai.value ?? null;
  return {
    id: `DEC-${doc.id}`,
    jurisdiction: jurisdictionFromDoc(doc),
    type: String(doc.file_type || "").includes("export") ? "Export" : "Import",
    hsCode: hs,
    value: value != null ? formatMoney(value) : "—",
    status: doc.is_verified
      ? "Approved"
      : doc.ai_result && !doc.is_verified
        ? "AI verified"
        : "Pending review",
    doc,
  };
}

function jurisdictionFromDoc(doc) {
  const dest = (doc.destination || doc.shipment_destination || "").toLowerCase();
  const origin = (doc.origin || doc.shipment_origin || "").toLowerCase();
  if (dest.includes("us") || origin.includes("us") || (doc.shipment_reference || "").toLowerCase().includes("us")) {
    return "US United States";
  }
  if (dest.includes("sg") || dest.includes("sin") || origin.includes("shanghai")) {
    return "SG Singapore";
  }
  return "EU Europe";
}

export function statusLabel(status) {
  const map = {
    pending: "Pending",
    in_transit: "In transit",
    customs_hold: "Customs",
    delivered: "Delivered",
    delayed: "Delayed",
    cancelled: "Cancelled",
  };
  return map[status] || status || "—";
}

export function statusClass(status) {
  const map = {
    pending: "bg-muted text-muted-foreground",
    in_transit: "bg-kinetic/10 text-kinetic",
    customs_hold: "bg-warning/15 text-warning",
    delivered: "bg-success/10 text-success",
    delayed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return map[status] || "bg-muted text-muted-foreground";
}
