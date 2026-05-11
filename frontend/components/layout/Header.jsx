"use client";

import { useState } from "react";

import { AvatarModal } from "@/components/AvatarModal";
import { useAssistant } from "@/context/AssistantContext";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const { user, logout } = useAuth();
  const { openAssistant } = useAssistant();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-line bg-panel/60 px-6 py-4 backdrop-blur-md">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-mist">Tableau de bord</p>
        <h2 className="font-display text-xl font-semibold text-[var(--text)]">
          Vue opérationnelle
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={openAssistant} className="btn-primary text-xs">
          Get Help
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-line bg-rail px-3 py-1.5 text-sm text-mist transition hover:border-brass/40 hover:text-[var(--text)]"
        >
          {user?.full_name || user?.email || "Profil"}
        </button>
        <button type="button" onClick={logout} className="btn-ghost text-xs">
          Déconnexion
        </button>
      </div>
      <AvatarModal open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
