"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Send, X } from "lucide-react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { messagesApi } from "@/lib/api";

function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function threadLabel(thread, myId) {
  if (thread.subject) return thread.subject;
  const other = thread.participants?.find((p) => p.id !== myId);
  if (other) return other.full_name;
  if (thread.shipment_reference) return `Shipment ${thread.shipment_reference}`;
  return `Thread #${thread.id}`;
}

function threadInitials(thread, myId) {
  const label = threadLabel(thread, myId);
  return label.slice(0, 2).toUpperCase();
}

export function MessagesPage() {
  const { user } = useAuth();
  const myId = user?.id;

  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [composeOpen, setComposeOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composing, setComposing] = useState(false);

  const loadThreads = useCallback(async () => {
    setError("");
    try {
      const { data } = await messagesApi.listThreads();
      const list = Array.isArray(data) ? data : [];
      setThreads(list);
      setActiveId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setThreads([]);
      setError(e?.response?.data?.detail || e?.message || "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThreadDetail = useCallback(async (threadId) => {
    if (!threadId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const { data } = await messagesApi.getThread(threadId);
      setDetail(data);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unread_count: 0 } : t))
      );
    } catch (e) {
      setDetail(null);
      setError(e?.response?.data?.detail || e?.message || "Could not load thread.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (activeId) loadThreadDetail(activeId);
    else setDetail(null);
  }, [activeId, loadThreadDetail]);

  const activeSummary = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const label = threadLabel(t, myId).toLowerCase();
      const snippet = (t.last_message || "").toLowerCase();
      return label.includes(q) || snippet.includes(q);
    });
  }, [threads, query, myId]);

  async function openCompose() {
    setComposeOpen(true);
    setComposeRecipient("");
    setComposeBody("");
    setComposeSubject("");
    try {
      const { data } = await messagesApi.listContacts();
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      setContacts([]);
    }
  }

  async function sendReply() {
    const text = draft.trim();
    if (!text || !activeId) return;
    setSending(true);
    try {
      const { data } = await messagesApi.sendMessage(activeId, { body: text });
      setDraft("");
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...(prev.messages || []),
                {
                  ...data,
                  is_mine: true,
                  sender_name: user?.full_name,
                },
              ],
              last_message: text,
              last_message_at: data.created_at,
            }
          : prev
      );
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? { ...t, last_message: text, last_message_at: data.created_at, unread_count: 0 }
            : t
        )
      );
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function submitCompose() {
    const body = composeBody.trim();
    const recipientId = Number(composeRecipient);
    if (!body || !recipientId) return;
    setComposing(true);
    setError("");
    try {
      const payload = {
        recipient_user_id: recipientId,
        body,
        subject: composeSubject.trim() || undefined,
      };
      const { data } = await messagesApi.createThread(payload);
      setComposeOpen(false);
      await loadThreads();
      setActiveId(data.id);
      setDetail(data);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Could not start conversation.");
    } finally {
      setComposing(false);
    }
  }

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
          <p className="eyebrow">Collaboration</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">Messages</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Direct conversations with importers, exporters, forwarders, and brokers on your network.
          </p>
        </div>
        <button type="button" onClick={openCompose} className="btn-primary inline-flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          New message
        </button>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!threads.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">No conversations yet. Start one with a trade partner.</p>
          <button type="button" onClick={openCompose} className="btn-primary mt-4">
            New message
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-paper lg:grid lg:grid-cols-[280px_1fr] lg:min-h-[520px]">
          <aside className="border-b border-border lg:border-b-0 lg:border-e">
            <div className="border-b border-border p-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search threads"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <ul className="max-h-[420px] overflow-y-auto">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors ${
                      activeId === t.id ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kinetic/10 font-mono text-[10px] text-kinetic">
                      {threadInitials(t, myId)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {threadLabel(t, myId)}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {relativeTime(t.last_message_at || t.updated_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {t.last_message || "—"}
                      </span>
                    </span>
                    {t.unread_count > 0 ? (
                      <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kinetic px-1 font-mono text-[10px] text-white">
                        {t.unread_count > 9 ? "9+" : t.unread_count}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="flex flex-col">
            {activeSummary ? (
              <>
                <div className="border-b border-border px-5 py-4">
                  <p className="font-medium text-foreground">{threadLabel(activeSummary, myId)}</p>
                  {activeSummary.shipment_id ? (
                    <Link
                      href={`/dashboard/shipments/${activeSummary.shipment_id}`}
                      className="text-xs text-kinetic hover:underline"
                    >
                      View shipment
                    </Link>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activeSummary.participants
                      ?.filter((p) => p.id !== myId)
                      .map((p) => `${p.full_name} · ${p.role}`)
                      .join(" · ")}
                  </p>
                </div>
                {detailLoading ? (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <ul className="flex-1 space-y-4 overflow-y-auto p-5">
                    {(detail?.messages || []).map((m) => (
                      <li
                        key={m.id}
                        className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                          m.is_mine
                            ? "ms-auto bg-foreground text-background"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {!m.is_mine && m.sender_name ? (
                          <p className="mb-1 text-xs font-medium opacity-70">{m.sender_name}</p>
                        ) : null}
                        {m.body}
                        <p
                          className={`mt-1 font-mono text-[10px] ${
                            m.is_mine ? "text-background/60" : "text-muted-foreground"
                          }`}
                        >
                          {relativeTime(m.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-border p-4">
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                      placeholder="Write a message…"
                      disabled={sending}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={sending || !draft.trim()}
                      className="btn-primary px-3 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {composeOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-title"
        >
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-paper">
            <button
              type="button"
              onClick={() => setComposeOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="compose-title" className="font-display text-xl text-foreground">
              New message
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">To</span>
                <select
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select contact…</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.role})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">Subject (optional)</span>
                <input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">Message</span>
                <textarea
                  rows={4}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setComposeOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCompose}
                disabled={composing || !composeBody.trim() || !composeRecipient}
                className="btn-primary disabled:opacity-50"
              >
                {composing ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
