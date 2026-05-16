import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Spark } from "./Spark";

export function KpiCard({
  label,
  value,
  delta,
  deltaPositive = true,
  sparkData,
  className = "",
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 shadow-paper transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
    >
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-mono text-3xl tabular-nums tracking-tight text-foreground md:text-4xl">
        {value}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        {sparkData ? <Spark data={sparkData} /> : <span />}
        {delta ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-xs ${
              deltaPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {deltaPositive ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            )}
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  );
}
