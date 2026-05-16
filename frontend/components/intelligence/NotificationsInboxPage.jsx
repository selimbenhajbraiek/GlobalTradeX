"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { notificationsApi } from "@/lib/api";

function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  try {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
  } catch {
    return "—";
  }
}

function groupLabel(iso) {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (d.getTime() >= weekAgo) return "Earlier this week";
  return "Earlier";
}

function NotificationIcon({ type }) {
  if (type === "success") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (type === "warning" || type === "error") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-warning">
        <AlertTriangle className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-kinetic/10 text-kinetic">
      <Sparkles className="h-4 w-4" aria-hidden />
    </span>
  );
}

export function NotificationsInboxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await notificationsApi.list({ limit: 50, unread_only: false });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setError(e?.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    setMarking(true);
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      setError(e?.message || "Could not mark notifications as read.");
    } finally {
      setMarking(false);
    }
  }

  async function markOneRead(id) {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      /* ignore single failure */
    }
  }

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = groupLabel(item.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()];
  }, [items]);

  const unread = items.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Shipment, customs and document alerts from your GlobalTradeX ledger.
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            disabled={marking}
            className="btn-secondary text-sm"
          >
            {marking ? "Updating…" : "Mark all as read"}
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!items.length ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          No notifications yet. Activity from shipments and document reviews will appear here.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([label, group]) => (
            <section key={label}>
              <p className="eyebrow !text-[10px]">{label}</p>
              <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card shadow-paper">
                {group.map((n) => (
                  <li key={n.id} className="flex gap-4 px-5 py-4">
                    <NotificationIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${n.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                        </p>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {relativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                      {!n.is_read ? (
                        <button
                          type="button"
                          onClick={() => markOneRead(n.id)}
                          className="mt-2 text-xs font-medium text-kinetic hover:underline"
                        >
                          Mark as read
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
