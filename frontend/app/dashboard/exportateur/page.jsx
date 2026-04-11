import Link from "next/link";

import { KPICard } from "@/components/ui/KPICard";

export default function ExportateurPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Espace exportateur</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Préparation des envois, packing lists et coordination transitaire.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Lots en préparation" value="—" hint="Lien produits / expéditions" />
        <KPICard label="Incoterms" value="—" hint="Paramétrez vos accords commerciaux" />
        <KPICard label="Cut-off prochain" value="—" hint="À brancher sur planning transport" />
      </div>
      <Link href="/dashboard/shipments/new" className="btn-primary inline-flex w-fit">
        Nouvelle expédition
      </Link>
    </div>
  );
}
