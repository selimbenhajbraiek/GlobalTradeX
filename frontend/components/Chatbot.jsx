"use client";

import { useState } from "react";

export function Chatbot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-80 max-w-[calc(100vw-3rem)] rounded-2xl border border-line bg-panel/95 p-4 shadow-lift backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-[var(--text)]">Assistant</p>
            <button
              type="button"
              className="text-mist hover:text-[var(--text)]"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-mist">
            Branchez ici votre flux IA (OpenAI, etc.) pour répondre aux questions douanes,
            HS codes et routes. Composant prêt à être relié à <code className="text-brass">/api/ai/chat</code>.
          </p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brass text-lg font-semibold text-ink shadow-lift transition hover:scale-[1.03] active:scale-[0.98]"
        aria-label="Ouvrir l’assistant"
      >
        ✦
      </button>
    </div>
  );
}
