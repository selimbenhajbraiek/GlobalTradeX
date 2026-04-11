import Link from "next/link";

import { KPICard } from "@/components/ui/KPICard";

export default function TransitairePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Espace transitaire</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Vue consolidée des flux clients, statuts et documents transport.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Files d’attente" value="—" hint="Priorisez les dossiers sensibles" />
        <KPICard label="Corridors actifs" value="—" hint="Mer / air / route" />
        <KPICard label="SLA douane" value="—" hint="Indicateurs à connecter" />
      </div>
      <Link href="/dashboard/shipments" className="btn-primary inline-flex w-fit">
        Liste des expéditions
      </Link>
    </div>
  );
}
