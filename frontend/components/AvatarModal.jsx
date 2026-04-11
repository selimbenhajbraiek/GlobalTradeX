"use client";

import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

export function AvatarModal({ open, onClose }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-mist">Profil</p>
            <p className="mt-1 font-display text-xl font-semibold text-[var(--text)]">
              {user?.full_name || "Utilisateur"}
            </p>
            <p className="mt-1 text-sm text-mist">{user?.email}</p>
            <p className="mt-3 inline-flex rounded-full border border-brass/30 bg-brass/10 px-3 py-1 text-xs font-medium text-brass">
              Rôle : {user?.role || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-2 py-1 text-sm text-mist hover:text-[var(--text)]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
