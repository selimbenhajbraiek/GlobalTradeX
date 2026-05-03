"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { shipmentsApi } from "@/lib/api";

export default function ShipmentsListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await shipmentsApi.getAll();
        if (!cancelled) setRows(data || []);
      } catch (e) {
        if (!cancelled) setError("Impossible de charger les expéditions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { key: "reference", label: "Référence" },
    { key: "origin", label: "Origine" },
    { key: "destination", label: "Destination" },
    {
      key: "status",
      label: "Statut",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "gps",
      label: "GPS",
      render: (row) =>
        row.origin_lat != null ? (
          <Link href={`/dashboard/shipments/${row.id}/tracking`} className="text-brass hover:underline">
            Suivi
          </Link>
        ) : (
          <span className="text-mist/40">—</span>
        ),
    },
    {
      key: "id",
      label: "",
      render: (row) => (
        <Link href={`/dashboard/shipments/${row.id}`} className="text-brass hover:underline">
          Détail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Liste expéditions</h1>
          <p className="mt-2 text-sm text-mist">Vue consolidée de vos flux import / export.</p>
        </div>
        <Link href="/dashboard/shipments/new" className="btn-primary">
          Créer expédition
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-200">{error}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          empty={
            <EmptyState
              title="Aucune expédition"
              description="Créez votre première expédition pour alimenter le tableau."
              action={
                <Link href="/dashboard/shipments/new" className="btn-primary">
                  Créer expédition
                </Link>
              }
            />
          }
        />
      )}
    </div>
  );
}
