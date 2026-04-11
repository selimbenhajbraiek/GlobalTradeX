"use client";

import { useEffect, useState } from "react";

import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { documentsApi } from "@/lib/api";

export default function DocumentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  async function refresh() {
    const { data } = await documentsApi.list();
    setRows(data || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setError("Impossible de charger les documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "invoice");
      await documentsApi.upload(fd);
      setUploadMsg("Fichier envoyé.");
      await refresh();
    } catch {
      setError("Échec de l’upload.");
    } finally {
      setUploading(false);
    }
  }

  const columns = [
    { key: "original_name", label: "Fichier" },
    { key: "filename", label: "Stocké" },
    { key: "file_type", label: "Type" },
    { key: "file_size", label: "Taille (o)" },
    { key: "uploaded_at", label: "Date" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Documents</h1>
          <p className="mt-2 text-sm text-mist">Liste et dépôt de pièces (factures, BL, certificats).</p>
        </div>
        <label className="btn-primary cursor-pointer">
          {uploading ? "Envoi…" : "Uploader"}
          <input type="file" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>
      {uploadMsg ? <p className="text-sm text-sea">{uploadMsg}</p> : null}

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
          empty={<EmptyState title="Aucun document" description="Importez votre première pièce jointe." />}
        />
      )}
    </div>
  );
}
