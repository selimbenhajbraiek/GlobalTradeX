"use client";

import Link from "next/link";
import { Filter, Download } from "lucide-react";

import { ShipmentStatusPill } from "@/components/shipments/ShipmentStatusPill";

export function ActiveShipmentsTable({
  title,
  eyebrow = "Inbound · this quarter",
  rows,
  selectedId,
  onSelect,
  showPo = true,
  showSupplier = true,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow !text-[10px]">{eyebrow}</p>
          <h2 className="mt-1 font-display text-xl text-foreground">{title}</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter
          </button>
          <button type="button" className="btn-secondary text-xs">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Shipment", showPo && "PO", showSupplier && "Supplier", "Lane", "Progress", "ETA", "Status"]
                .filter(Boolean)
                .map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                  No shipments to display.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedId === row.id ? "bg-kinetic/5" : ""
                  }`}
                  onClick={() => onSelect?.(row.id === selectedId ? null : row.id)}
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <Link
                      href={`/dashboard/shipments/${row.id}`}
                      className="font-mono text-sm font-medium text-foreground hover:text-kinetic"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.reference}
                    </Link>
                  </td>
                  {showPo ? (
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted-foreground">
                      {row.po}
                    </td>
                  ) : null}
                  {showSupplier ? (
                    <td className="px-5 py-4 text-sm text-foreground">{row.supplier}</td>
                  ) : null}
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground">{row.lane}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{row.laneFull}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-[100px] items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full gradient-kinetic transition-all"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {row.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted-foreground">
                    {row.eta}
                  </td>
                  <td className="px-5 py-4">
                    <ShipmentStatusPill status={row.status} trackingStatus={row.tracking_status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
