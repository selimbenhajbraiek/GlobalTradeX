"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { shipmentsApi } from "@/lib/api";

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await shipmentsApi.getById(id);
        if (!cancelled) {
          setRow(data);
          setStatus(data.status);
        }
      } catch {
        if (!cancelled) setError("Expédition introuvable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function saveStatus() {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await shipmentsApi.updateStatus(id, { new_status: status });
      setRow(data);
    } catch {
      setError("Mise à jour du statut impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-200">{error || "Introuvable."}</p>
        <Link href="/dashboard/shipments" className="btn-ghost">
          Retour liste
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mist">Détail expédition</p>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">
            {row.reference || `Expédition #${row.id}`}
          </h1>
          <p className="mt-2 text-sm text-mist">
            {row.origin} → {row.destination} · {row.cargo_type} · {row.transport_mode}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <div className="glass grid gap-4 rounded-2xl p-6 shadow-lift sm:grid-cols-2">
        <div>
          <p className="text-xs text-mist">Créée le</p>
          <p className="mt-1 text-sm text-[var(--text)]">{row.created_at}</p>
        </div>
        <div>
          <p className="text-xs text-mist">Mise à jour</p>
          <p className="mt-1 text-sm text-[var(--text)]">{row.updated_at}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-mist">Notes</p>
          <p className="mt-1 text-sm text-[var(--text)]">{row.notes || "—"}</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 shadow-lift">
        <p className="font-medium text-[var(--text)]">Changer le statut</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select className="input-field max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">pending</option>
            <option value="in_transit">in_transit</option>
            <option value="customs_hold">customs_hold</option>
            <option value="delivered">delivered</option>
            <option value="delayed">delayed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button type="button" className="btn-primary" onClick={saveStatus} disabled={saving}>
            {saving ? "…" : "Appliquer"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/shipments" className="btn-ghost">
          ← Liste
        </Link>
        <button type="button" className="btn-ghost" onClick={() => router.push("/dashboard/documents")}>
          Joindre un document
        </button>
      </div>
    </div>
  );
}
