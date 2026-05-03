"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { trackingApi } from "@/lib/api";

const LiveMapSingle = dynamic(
  () => import("@/components/tracking/LiveMap").then((m) => m.LiveMapSingle),
  { ssr: false, loading: () => <div className="h-[400px] animate-pulse rounded-xl bg-panel" /> }
);

const TRACK_STEPS = [
  { key: "pending", label: "En attente" },
  { key: "dispatched", label: "Expédié" },
  { key: "in_transit", label: "En transit" },
  { key: "out_for_delivery", label: "En livraison" },
  { key: "delivered", label: "Livré" },
];

function apiErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  return e?.message || "Erreur";
}

function stepIndex(status) {
  const i = TRACK_STEPS.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}

function TrackingDetailInner() {
  const params = useParams();
  const id = params?.id;
  const { user } = useAuth();
  const role = user?.role || "";
  const canControl = ["admin", "importateur", "exportateur", "transitaire"].includes(role);

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await trackingApi.state(id);
      setState(data);
    } catch (e) {
      setError(apiErr(e));
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return undefined;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [load, id]);

  const curIdx = useMemo(() => stepIndex(state?.tracking_status), [state?.tracking_status]);

  async function run(action) {
    if (!id) return;
    setBusy(action);
    setError("");
    try {
      if (action === "start") await trackingApi.start(id);
      else if (action === "pause") await trackingApi.pause(id);
      else if (action === "reset") await trackingApi.reset(id);
      await load();
    } catch (e) {
      setError(apiErr(e));
    } finally {
      setBusy("");
    }
  }

  if (loading && !state) {
    return <div className="h-64 animate-pulse rounded-xl bg-panel" />;
  }

  if (error && !state) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-300">{error}</p>
        <Link href="/dashboard/shipments" className="text-brass hover:underline">
          Retour aux expéditions
        </Link>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mist">Suivi GPS</p>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">{state.reference}</h1>
          <p className="mt-2 text-sm text-mist">
            Statut suivi: <span className="text-[var(--text)]">{state.tracking_status}</span> · moteur:{" "}
            <span className="text-[var(--text)]">{state.simulation_state}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/shipments/${id}`} className="rounded-lg border border-line bg-panel px-4 py-2 text-sm text-[var(--text)] hover:bg-rail/40">
            Fiche expédition
          </Link>
          <Link href="/dashboard/shipments/tracking" className="rounded-lg border border-line bg-panel px-4 py-2 text-sm text-brass hover:bg-rail/40">
            Carte globale
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {canControl ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy || state.simulation_state === "running"}
            onClick={() => run("start")}
            className="btn-primary disabled:opacity-50"
          >
            {busy === "start" ? "…" : "Démarrer simulation"}
          </button>
          <button
            type="button"
            disabled={!!busy || state.simulation_state !== "running"}
            onClick={() => run("pause")}
            className="rounded-lg border border-line bg-panel px-4 py-2 text-sm text-[var(--text)] hover:bg-rail/40 disabled:opacity-50"
          >
            {busy === "pause" ? "…" : "Pause"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("reset")}
            className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950/50 disabled:opacity-50"
          >
            {busy === "reset" ? "…" : "Réinitialiser"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-mist">Lecture seule — contrôles réservés au propriétaire, exportateur lié, transitaire ou admin.</p>
      )}

      <div className="rounded-xl border border-line bg-panel p-6">
        <h2 className="text-sm font-semibold text-[var(--text)]">Progression (statut suivi)</h2>
        <div className="mt-6 flex w-full flex-wrap items-center gap-1 overflow-x-auto pb-2">
          {TRACK_STEPS.map((step, i) => {
            const done = i < curIdx;
            const current = i === curIdx;
            return (
              <Fragment key={step.key}>
                <div className="flex min-w-[72px] flex-col items-center text-center">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      done
                        ? "bg-emerald-600 text-white"
                        : current
                          ? "bg-brass text-rail ring-4 ring-brass/30"
                          : "bg-panel text-mist ring-1 ring-line"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <p className="mt-2 max-w-[100px] text-[11px] font-medium leading-tight text-mist">{step.label}</p>
                </div>
                {i < TRACK_STEPS.length - 1 ? (
                  <div
                    className={`mb-6 h-0.5 min-w-[12px] flex-1 ${i < curIdx ? "bg-emerald-500/80" : "bg-line"}`}
                    aria-hidden
                  />
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>

      <LiveMapSingle state={state} height={420} />

      <div className="grid gap-4 sm:grid-cols-2 text-sm text-mist">
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs uppercase text-mist/80">Progression normalisée</p>
          <p className="mt-1 text-lg font-semibold text-[var(--text)]">{(state.tracking_progress * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs uppercase text-mist/80">Points d’historique</p>
          <p className="mt-1 text-lg font-semibold text-[var(--text)]">{(state.location_history || []).length}</p>
        </div>
      </div>
    </div>
  );
}

export default function ShipmentTrackingDetailPage() {
  return (
    <RoleGuard allowedRoles={["admin", "importateur", "exportateur", "transitaire", "courtier"]}>
      <TrackingDetailInner />
    </RoleGuard>
  );
}
