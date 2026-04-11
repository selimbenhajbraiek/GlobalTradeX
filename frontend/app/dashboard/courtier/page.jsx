import Link from "next/link";

import { KPICard } from "@/components/ui/KPICard";

export default function CourtierPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Espace courtier</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Agrégation des déclarations, validation documentaire et calculateur droits & fret.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Dossiers en analyse" value="—" hint="OCR / IA documentaire" />
        <KPICard label="Montants estimés" value="—" hint="Via calculateur intégré" />
        <KPICard label="Alertes HS" value="—" hint="Contrôles nomenclature" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/calculator" className="btn-primary">
          Calculateur
        </Link>
        <Link href="/dashboard/documents" className="btn-ghost">
          Documents
        </Link>
      </div>
    </div>
  );
}
