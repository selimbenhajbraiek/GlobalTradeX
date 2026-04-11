import { KPICard } from "@/components/ui/KPICard";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Supervision globale : utilisateurs, rôles et paramètres plateforme (à brancher sur vos endpoints admin).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Utilisateurs" value="API /users" hint="Protégé par authentification" />
        <KPICard label="Rôles" hint="Attribués côté base de données" value="—" />
        <KPICard label="Santé API" value="/api/health" hint="Surveillez votre backend FastAPI" />
      </div>
    </div>
  );
}
