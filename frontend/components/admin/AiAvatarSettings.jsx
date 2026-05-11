"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PlayCircle, Save } from "lucide-react";

import { adminAssistantApi } from "@/lib/api";

const ACCENT = "#533AB7";
const SURFACE = "#EEEDFE";

export function AiAvatarSettings() {
  const [settings, setSettings] = useState(null);
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [testVideoUrl, setTestVideoUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsResponse, avatarsResponse] = await Promise.all([
        adminAssistantApi.settings(),
        adminAssistantApi.avatars().catch(() => ({ data: { avatars: [] } })),
      ]);
      setSettings(settingsResponse.data);
      setAvatars(Array.isArray(avatarsResponse.data?.avatars) ? avatarsResponse.data.avatars : []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not load assistant settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await adminAssistantApi.updateSettings(settings);
      setSettings(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function testAvatar() {
    setTesting(true);
    setError("");
    setTestVideoUrl("");
    try {
      const { data } = await adminAssistantApi.test({
        message: "How do I track a shipment?",
      });
      setTestVideoUrl(data.video_url || "");
      if (data.error && !data.video_url) {
        setError(data.error);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Avatar test failed.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-violet-100/60" />;
  }

  if (!settings) {
    return <p className="text-sm text-red-600">{error || "Assistant settings unavailable."}</p>;
  }

  return (
    <section className="rounded-3xl border p-6 shadow-sm" style={{ borderColor: `${ACCENT}33`, backgroundColor: SURFACE }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: ACCENT }}>
            AI Avatar Settings
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">HeyGen assistant</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Configure the live support avatar, greeting, and availability for all dashboard users.
          </p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}>
          {settings.heygen_configured ? "HeyGen connected" : "HeyGen not configured"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">HeyGen avatar</span>
          {avatars.length ? (
            <select
              className="input-field w-full"
              value={settings.heygen_avatar_id || ""}
              onChange={(event) => setSettings({ ...settings, heygen_avatar_id: event.target.value })}
            >
              <option value="">Select an avatar</option>
              {avatars.map((avatar) => (
                <option key={avatar.avatar_id} value={avatar.avatar_id}>
                  {avatar.avatar_name || avatar.avatar_id}
                  {avatar.gender ? ` (${avatar.gender})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-field w-full"
              value={settings.heygen_avatar_id || ""}
              onChange={(event) => setSettings({ ...settings, heygen_avatar_id: event.target.value })}
            />
          )}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">HeyGen voice ID (optional)</span>
          <input
            className="input-field w-full"
            value={settings.heygen_voice_id || ""}
            onChange={(event) => setSettings({ ...settings, heygen_voice_id: event.target.value })}
          />
        </label>
        <label className="block text-sm lg:col-span-2">
          <span className="mb-1 block font-medium text-slate-700">Greeting message</span>
          <textarea
            className="input-field min-h-24 w-full"
            value={settings.greeting_message || ""}
            onChange={(event) => setSettings({ ...settings, greeting_message: event.target.value })}
          />
        </label>
        <label className="flex items-center gap-3 text-sm lg:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(settings.is_enabled)}
            onChange={(event) => setSettings({ ...settings, is_enabled: event.target.checked })}
          />
          <span className="font-medium text-slate-700">Enable assistant for users</span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
        <button
          type="button"
          onClick={testAvatar}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Test avatar response
        </button>
      </div>

      {testVideoUrl ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-violet-200 bg-black">
          <video src={testVideoUrl} controls autoPlay className="w-full" />
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
