"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SUPPORTED_LOCALES, translations } from "@/messages/translations";

const STORAGE_KEY = "globaltradex-locale";

const LocaleContext = createContext(null);

function getByPath(obj, path) {
  const keys = path.split(".");
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[k];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LOCALES.includes(saved)) {
        setLocaleState(saved);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    }
  }, [locale, ready]);

  const setLocale = useCallback((next) => {
    if (SUPPORTED_LOCALES.includes(next)) {
      setLocaleState(next);
    }
  }, []);

  const t = useCallback(
    (key) => {
      const dict = translations[locale] || translations.en;
      const fromLocale = getByPath(dict, key);
      if (fromLocale !== undefined) return fromLocale;
      const fromEn = getByPath(translations.en, key);
      if (fromEn !== undefined) return fromEn;
      return key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      locales: SUPPORTED_LOCALES,
      ready,
    }),
    [locale, setLocale, t, ready]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
