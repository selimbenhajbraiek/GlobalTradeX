"use client";

import { useEffect, useState } from "react";

import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { productsApi } from "@/lib/api";

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await productsApi.getAll();
        if (!cancelled) setRows(data || []);
      } catch {
        if (!cancelled) setError("Impossible de charger les produits.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    { key: "name", label: "Produit" },
    { key: "hs_code", label: "HS code" },
    { key: "quantity", label: "Qté" },
    { key: "unit", label: "Unité" },
    { key: "unit_price", label: "Prix unitaire" },
    { key: "origin_country", label: "Pays origine" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Produits</h1>
        <p className="mt-2 text-sm text-mist">
          Produits liés à vos expéditions (endpoint <code className="text-brass">GET /api/products</code>).
        </p>
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
              title="Aucun produit"
              description="Créez des produits côté API ou associez-les à une expédition pour les voir ici."
            />
          }
        />
      )}
    </div>
  );
}
