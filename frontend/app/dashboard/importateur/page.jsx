import Link from "next/link";

import { KPICard } from "@/components/ui/KPICard";

export default function ImportateurPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Espace importateur</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Suivi des arrivées, conformité douanière et documents fournisseurs.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Expéditions actives" value="—" hint="Synchronisées depuis l’API" />
        <KPICard label="Documents en attente" value="—" hint="Factures, BL, certificats" />
        <KPICard label="Dernière déclaration" value="—" hint="À relier à votre module douane" />
      </div>
      <Link href="/dashboard/shipments" className="btn-primary inline-flex w-fit">
        Voir les expéditions
      </Link>
    </div>
  );
}
