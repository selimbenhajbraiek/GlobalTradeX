"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { buildTimeline, formatTimelineDate } from "@/lib/role-dashboard";
import { documentsApi } from "@/lib/api";

const TRADE_LABELS = {
  commercial_invoice: "Commercial Invoice",
  bill_of_lading: "Bill of Lading",
  packing_list: "Packing List",
  certificate_of_origin: "Certificate of Origin",
  customs_declaration: "Customs Declaration",
  other: "Document",
};

export function ShipmentDetailPanels({ shipment }) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!shipment?.id) {
      setDocs([]);
      return;
    }
    let cancelled = false;
    documentsApi
      .byShipment(shipment.id)
      .then(({ data }) => {
        if (!cancelled) setDocs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [shipment?.id]);

  if (!shipment) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
        Select a shipment to view timeline, documents and AI alerts.
      </p>
    );
  }

  const timeline = buildTimeline(shipment);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-6 shadow-paper lg:col-span-1">
        <p className="eyebrow !text-[10px]">Timeline · {shipment.reference}</p>
        <ul className="mt-6 space-y-0">
          {timeline.map((ev, i) => (
            <li key={i} className="relative flex gap-4 pb-8 last:pb-0">
              {i < timeline.length - 1 ? (
                <span
                  className="absolute start-[7px] top-3 h-[calc(100%-4px)] w-px bg-border"
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                  ev.done
                    ? "border-foreground bg-foreground"
                    : "border-muted-foreground bg-background"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] text-muted-foreground">
                  {formatTimelineDate(ev.time)}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{ev.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{ev.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
        <p className="eyebrow !text-[10px]">Documents</p>
        <ul className="mt-4 space-y-2">
          {docs.length === 0 ? (
            <li className="text-sm text-muted-foreground">No documents filed yet.</li>
          ) : (
            docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5"
              >
                <span className="truncate text-sm text-foreground">
                  {TRADE_LABELS[d.file_type] || d.original_name} · {d.original_name}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                  {(d.original_name || "").split(".").pop()}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-foreground bg-foreground p-6 text-background shadow-paper">
        <p className="eyebrow !text-[10px] text-background/60">Smart alert</p>
        <p className="mt-4 text-sm leading-relaxed">
          {shipment.status === "delayed"
            ? `${shipment.reference} is delayed on lane ${shipment.origin} → ${shipment.destination}. AI suggests expedited customs filing.`
            : shipment.status === "customs_hold"
              ? `Customs hold on ${shipment.reference}. Pre-file EU-304 documentation to save ~6h clearance.`
              : `Suez backlog detected. AI suggests rerouting ${shipment.reference} via Tanger Med — saves 3.2 days.`}
        </p>
        <button type="button" className="mt-6 w-full rounded-md bg-background px-4 py-2.5 text-sm font-medium text-foreground">
          Review options
        </button>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-background/50">
          <Sparkles className="h-3 w-3" aria-hidden />
          TradeFlow AI
        </p>
      </div>
    </div>
  );
}
