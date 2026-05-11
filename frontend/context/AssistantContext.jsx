"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AssistantContext = createContext(null);

export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openAssistant = useCallback(() => setOpen(true), []);
  const closeAssistant = useCallback(() => setOpen(false), []);
  const toggleAssistant = useCallback(() => setOpen((value) => !value), []);

  const value = useMemo(
    () => ({
      open,
      openAssistant,
      closeAssistant,
      toggleAssistant,
    }),
    [open, openAssistant, closeAssistant, toggleAssistant]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return ctx;
}
