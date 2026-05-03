"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { trackingApi } from "@/lib/api";

const LiveMapOverview = dynamic(
  () => import("@/components/tracking/LiveMap").then((m) => m.LiveMapOverview),
  { ssr: false, loading: () => <div className="h-[440px] animate-pulse rounded-xl bg-panel" /> }
);

function apiErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  return e?.message || "Erreur";
}

function TrackingOverviewInner() {
  const { user } = useAuth();
  const role = user?.role || "";
  const canSeed = ["admin", "importateur", "exportateur"].includes(role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await trackingApi.active();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, 3500);
    return () => clearInterval(id);
  }, [load]);

  async function seedDemos() {
    setMsg("");
    try {
      const { data } = await trackingApi.seedDemos();
      setMsg(data?.message || "Démos créées.");
      await load();
    } catch (e) {
      setError(apiErr(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Suivi GPS (simulation)</h1>
          <p className="mt-2 max-w-2xl text-sm text-mist">
            Carte en temps quasi réel : positions simulées avec interpolation, bruit GPS et pauses aléatoires.
            Les mises à jour se synchronisent toutes les ~3 s (polling).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSeed ? (
            <button type="button" onClick={seedDemos} className="btn-primary">
              Créer expéditions démo
            </button>
          ) : null}
          <button type="button" onClick={() => load()} className="rounded-lg border border-line bg-panel px-4 py-2 text-sm text-[var(--text)] hover:bg-rail/40">
            Actualiser
          </button>
        </div>
      </div>

      {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {loading && !items.length ? (
        <div className="h-[440px] animate-pulse rounded-xl bg-panel" />
      ) : (
        <LiveMapOverview shipments={items} height={460} />
      )}

      <div className="rounded-xl border border-line bg-panel p-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Légende</h2>
        <ul className="mt-2 flex flex-wrap gap-4 text-xs text-mist">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500" /> Position actuelle (par couleur)
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-brass" /> Trajet historique
          </li>
        </ul>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
          <MapPin className="h-5 w-5 text-brass" aria-hidden />
          Expéditions suivies
        </h2>
        {items.length === 0 && !loading ? (
          <p className="text-sm text-mist">
            Aucune expédition avec coordonnées GPS. Initialisez le suivi depuis le détail d’une expédition ou créez
            des démos.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-panel">
            {items.map((s) => (
              <li key={s.shipment_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-[var(--text)]">{s.reference}</p>
                  <p className="text-xs text-mist">
                    {s.tracking_status} · simulation: {s.simulation_state} · progrès {(s.tracking_progress * 100).toFixed(0)}%
                  </p>
                </div>
                <Link
                  href={`/dashboard/shipments/${s.shipment_id}/tracking`}
                  className="text-sm text-brass hover:underline"
                >
                  Détail & contrôles
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function LiveTrackingPage() {
  return (
    <RoleGuard allowedRoles={["admin", "importateur", "exportateur", "transitaire", "courtier"]}>
      <TrackingOverviewInner />
    </RoleGuard>
  );
}
