import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { KpiSparkArea } from "@/components/app/KpiSparkArea";

export function RoleKpiCard({
  label,
  value,
  delta,
  up = true,
  icon: Icon,
  series,
  positiveIsGood = true,
}) {
  const good = positiveIsGood ? up : !up;
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-paper transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow !text-[10px]">{label}</p>
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl tracking-tight text-foreground tabular-nums">{value}</p>
      <span
        className={`mt-1 inline-flex items-center gap-0.5 font-mono text-xs ${
          good ? "text-success" : "text-destructive"
        }`}
      >
        {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
        {delta}
      </span>
      <div className="mt-4 -mx-1">
        <KpiSparkArea data={series} width={220} height={44} className="h-11 w-full" />
      </div>
    </div>
  );
}
