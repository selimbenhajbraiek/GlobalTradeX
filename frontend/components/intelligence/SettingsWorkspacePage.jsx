"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { usersApi } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/dashboard-nav";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/messages/translations";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "workspace", label: "Workspace" },
  { id: "assistant", label: "Assistant" },
  { id: "notifications", label: "Notifications" },
];

const PREF_KEYS = [
  ["emailDigest", "email_digest", "Daily digest email"],
  ["shipmentAlerts", "shipment_alerts", "Shipment status changes"],
  ["customsAlerts", "customs_alerts", "Customs & compliance"],
  ["aiSummaries", "ai_summaries", "AI summary briefings"],
];

function prefsFromUser(user) {
  const p = user?.notification_preferences || {};
  return {
    emailDigest: p.email_digest !== false,
    shipmentAlerts: p.shipment_alerts !== false,
    customsAlerts: p.customs_alerts !== false,
    aiSummaries: p.ai_summaries !== false,
  };
}

export function SettingsWorkspacePage() {
  const { user, refreshUser } = useAuth();
  const { locale, setLocale } = useLocale();
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    role: "",
    phone: "",
    localeLabel: LOCALE_LABELS[locale] || "EN · English",
  });

  const [workspace, setWorkspace] = useState({
    company: "GlobalTradeX",
    environment: "Production",
    region: "—",
  });

  useEffect(() => {
    if (!user) return;
    setProfile({
      fullName: user.full_name || "",
      email: user.email || "",
      role: ROLE_LABELS[user.role] || user.role,
      phone: user.phone || "",
      localeLabel: LOCALE_LABELS[locale] || "EN · English",
    });
  }, [user, locale]);

  const [prefs, setPrefs] = useState({
    emailDigest: true,
    shipmentAlerts: true,
    customsAlerts: true,
    aiSummaries: true,
  });

  useEffect(() => {
    if (!user) return;
    setPrefs(prefsFromUser(user));
  }, [user]);

  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      if (tab === "profile") {
        await usersApi.updateMe({
          full_name: profile.fullName.trim(),
          phone: profile.phone?.trim() || null,
        });
        await refreshUser();
      } else if (tab === "notifications") {
        await usersApi.updateMe({
          notification_preferences: {
            email_digest: prefs.emailDigest,
            shipment_alerts: prefs.shipmentAlerts,
            customs_alerts: prefs.customsAlerts,
            ai_summaries: prefs.aiSummaries,
          },
        });
        await refreshUser();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e?.response?.data?.detail || e?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage your profile, workspace and integrations.
        </p>
      </header>

      {saveError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                tab === t.id
                  ? "bg-foreground font-medium text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 shadow-paper">
          {tab === "profile" ? (
            <>
              <p className="eyebrow !text-[10px]">Profile</p>
              <p className="mt-1 text-sm text-muted-foreground">Update your personal details.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Full name</span>
                  <input
                    value={profile.fullName}
                    onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border-0 bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Email</span>
                  <input
                    value={profile.email}
                    readOnly
                    className="mt-1.5 w-full rounded-lg border-0 bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground outline-none"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Role</span>
                  <input
                    value={profile.role}
                    readOnly
                    className="mt-1.5 w-full rounded-lg border-0 bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground outline-none"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Locale</span>
                  <select
                    value={locale}
                    onChange={(e) => {
                      setLocale(e.target.value);
                      setProfile((p) => ({
                        ...p,
                        localeLabel: LOCALE_LABELS[e.target.value] || e.target.value,
                      }));
                    }}
                    className="mt-1.5 w-full rounded-lg border-0 bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {SUPPORTED_LOCALES.map((code) => (
                      <option key={code} value={code}>
                        {LOCALE_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="button" onClick={handleSave} className="btn-primary mt-6">
                {saved ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4" aria-hidden />
                    Saved
                  </span>
                ) : (
                  "Save changes"
                )}
              </button>
            </>
          ) : null}

          {tab === "workspace" ? (
            <>
              <p className="eyebrow !text-[10px]">Workspace</p>
              <p className="mt-1 text-sm text-muted-foreground">Organization and environment.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Company</span>
                  <input
                    value={workspace.company}
                    onChange={(e) => setWorkspace((w) => ({ ...w, company: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border-0 bg-muted px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Environment</span>
                  <input
                    value={workspace.environment}
                    onChange={(e) => setWorkspace((w) => ({ ...w, environment: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border-0 bg-muted px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Region</span>
                  <input
                    value={workspace.region}
                    onChange={(e) => setWorkspace((w) => ({ ...w, region: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border-0 bg-muted px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              </div>
              <button type="button" onClick={handleSave} className="btn-primary mt-6">
                Save changes
              </button>
            </>
          ) : null}

          {tab === "assistant" ? (
            <>
              <p className="eyebrow !text-[10px]">Assistant</p>
              <p className="mt-1 text-sm text-muted-foreground">
                TradeFlow AI voice and video preferences.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-foreground">
                <li className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                  <span>Voice responses</span>
                  <span className="text-xs text-success">Enabled</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                  <span>Proactive shipment alerts</span>
                  <span className="text-xs text-success">Enabled</span>
                </li>
              </ul>
              <Link href="/dashboard/assistant" className="btn-secondary mt-6 inline-flex text-sm">
                Open TradeFlow AI
              </Link>
              {user?.role === "admin" ? (
                <Link
                  href="/dashboard/admin/assistant-avatar"
                  className="btn-ghost mt-2 inline-flex text-sm"
                >
                  Admin avatar setup →
                </Link>
              ) : null}
            </>
          ) : null}

          {tab === "notifications" ? (
            <>
              <p className="eyebrow !text-[10px]">Notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose what reaches your inbox.</p>
              <ul className="mt-6 space-y-3">
                {PREF_KEYS.map(([key, , label]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <span className="text-sm">{label}</span>
                    <input
                      type="checkbox"
                      checked={prefs[key]}
                      onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-border text-kinetic focus:ring-kinetic"
                    />
                  </li>
                ))}
              </ul>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary mt-6 disabled:opacity-60">
                {saving ? "Saving…" : saved ? "Saved" : "Save preferences"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
