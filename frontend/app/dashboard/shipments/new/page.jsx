"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { shipmentsApi } from "@/lib/api";

export default function NewShipmentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    reference: "",
    status: "pending",
    origin: "",
    destination: "",
    cargo_type: "general",
    transport_mode: "sea",
    weight_kg: "",
    volume_m3: "",
    estimated_value: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const payload = {
        reference: form.reference.trim() || `REF-${Date.now()}`,
        origin: form.origin,
        destination: form.destination,
        cargo_type: form.cargo_type,
        transport_mode: form.transport_mode,
        status: form.status,
        notes: form.notes.trim() ? form.notes : null,
        weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
        volume_m3: form.volume_m3 === "" ? null : Number(form.volume_m3),
        estimated_value: form.estimated_value === "" ? null : Number(form.estimated_value),
      };
      const { data } = await shipmentsApi.create(payload);
      router.replace(`/dashboard/shipments/${data.id}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Création impossible.";
      setError(typeof msg === "string" ? msg : "Erreur API");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-mist">Expéditions</p>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Créer expédition</h1>
        <p className="mt-2 text-sm text-mist">Champs alignés sur le schéma backend `ShipmentCreate`.</p>
      </div>

      <form onSubmit={onSubmit} className="glass space-y-4 rounded-2xl p-6 shadow-lift">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-mist">Référence (unique, max 50)</label>
            <input
              className="input-field mt-1"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Laissez vide pour générer REF-…"
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-mist">Statut</label>
            <select
              className="input-field mt-1"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="pending">pending</option>
              <option value="in_transit">in_transit</option>
              <option value="customs_hold">customs_hold</option>
              <option value="delivered">delivered</option>
              <option value="delayed">delayed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-mist">Type de fret</label>
            <select
              className="input-field mt-1"
              value={form.cargo_type}
              onChange={(e) => setForm((f) => ({ ...f, cargo_type: e.target.value }))}
            >
              <option value="general">general</option>
              <option value="fragile">fragile</option>
              <option value="dangerous">dangerous</option>
              <option value="perishable">perishable</option>
              <option value="oversized">oversized</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-mist">Mode transport</label>
            <select
              className="input-field mt-1"
              value={form.transport_mode}
              onChange={(e) => setForm((f) => ({ ...f, transport_mode: e.target.value }))}
            >
              <option value="air">air</option>
              <option value="sea">sea</option>
              <option value="road">road</option>
              <option value="rail">rail</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-mist">Origine</label>
            <input
              className="input-field mt-1"
              value={form.origin}
              onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-mist">Destination</label>
            <input
              className="input-field mt-1"
              value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-mist">Poids (kg)</label>
            <input
              type="number"
              step="0.01"
              className="input-field mt-1"
              value={form.weight_kg}
              onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-mist">Volume (m³)</label>
            <input
              type="number"
              step="0.001"
              className="input-field mt-1"
              value={form.volume_m3}
              onChange={(e) => setForm((f) => ({ ...f, volume_m3: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-mist">Valeur estimée</label>
            <input
              type="number"
              step="0.01"
              className="input-field mt-1"
              value={form.estimated_value}
              onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-mist">Notes</label>
            <textarea
              className="input-field mt-1 min-h-[96px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-red-200">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="h-4 w-4 border-2 border-ink/30 border-t-ink" />
                Enregistrement…
              </span>
            ) : (
              "Enregistrer"
            )}
          </button>
          <Link href="/dashboard/shipments" className="btn-ghost">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
