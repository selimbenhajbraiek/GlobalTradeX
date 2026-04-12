"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { aiApi, shipmentsApi } from "@/lib/api";

const CHIPS = [
  "Where is my shipment?",
  "Why customs hold?",
  "What documents are missing?",
  "When will it arrive?",
];

function normalizeRole(role) {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "value" in role) return String(role.value);
  return "";
}

export function Chatbot() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isImporter = role === "importateur";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [recentShipments, setRecentShipments] = useState([]);
  const bottomRef = useRef(null);

  const shipmentIdFromPath = useMemo(() => {
    const m = pathname?.match(/^\/dashboard\/shipments\/(\d+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const loadContext = useCallback(async () => {
    try {
      const { data } = await shipmentsApi.getAll(
        role === "admin" ? {} : { mine_only: true }
      );
      const list = Array.isArray(data) ? data : [];
      let mapped = list.slice(0, 5).map((s) => ({
        id: s.id,
        reference: s.reference,
        origin: s.origin,
        destination: s.destination,
        status: s.status,
        transport_mode: s.transport_mode,
      }));
      if (shipmentIdFromPath) {
        const existing = mapped.find((x) => String(x.id) === String(shipmentIdFromPath));
        if (!existing) {
          try {
            const { data: one } = await shipmentsApi.getById(shipmentIdFromPath);
            if (one) {
              mapped = [
                {
                  id: one.id,
                  reference: one.reference,
                  origin: one.origin,
                  destination: one.destination,
                  status: one.status,
                  transport_mode: one.transport_mode,
                },
                ...mapped.filter((x) => String(x.id) !== String(one.id)),
              ].slice(0, 5);
            }
          } catch {
            /* 403 etc. */
          }
        }
      }
      setRecentShipments(mapped);
    } catch {
      setRecentShipments([]);
    }
  }, [role, shipmentIdFromPath]);

  useEffect(() => {
    if (open) {
      loadContext();
    }
  }, [open, loadContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  const bubbleClass = isImporter
    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700"
    : "bg-brass text-ink shadow-lift hover:scale-[1.03]";

  const panelClass = isImporter
    ? "border-blue-200 bg-sky-50 text-slate-900"
    : "border-line bg-panel/95 text-[var(--text)]";

  async function sendText(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    setError("");
    const history = messages.slice(-5).map((x) => ({
      role: x.role,
      content: x.content,
    }));
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setTyping(true);
    try {
      const { data } = await aiApi.chat({
        message: trimmed,
        history,
        user_role: role || "user",
        recent_shipments: recentShipments,
      });
      const reply = data?.response ?? "";
      const err = data?.error;
      if (err) {
        setError(String(err));
      }
      setMessages((m) => [...m, { role: "assistant", content: reply || "No response." }]);
    } catch (e) {
      setError(e?.message || "Request failed.");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I could not reach the assistant. Try again later." },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    sendText(input);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <div
        className={`flex w-[min(100vw-3rem,24rem)] max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-2xl border shadow-xl transition-all duration-300 ease-out ${
          open
            ? "translate-x-0 opacity-100"
            : "pointer-events-none invisible max-h-0 w-0 translate-x-8 overflow-hidden border-0 p-0 opacity-0"
        } ${panelClass}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
          <p className="font-display text-sm font-semibold">GlobalTradeX Assistant</p>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-500 hover:bg-white/50"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          >
            ×
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-600">
                Ask about your shipments, customs, or documents. Quick suggestions:
              </p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? isImporter
                        ? "bg-blue-600 text-white"
                        : "bg-brass/90 text-ink"
                      : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {typing ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:120ms]">.</span>
                    <span className="animate-bounce [animation-delay:240ms]">.</span>
                  </span>
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
          {open ? (
            <div className="border-t border-slate-200/80 px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-900 hover:bg-blue-50"
                    onClick={() => sendText(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {error ? <p className="px-3 pb-2 text-xs text-red-600">{error}</p> : null}
          <form onSubmit={onSubmit} className="border-t border-slate-200/80 p-3">
            <div className="flex gap-2">
              <input
                className="input-field min-w-0 flex-1 text-sm"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                  isImporter ? "bg-blue-600 hover:bg-blue-700" : "bg-brass text-ink hover:opacity-95"
                }`}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold transition active:scale-[0.98] ${bubbleClass}`}
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? "×" : <MessageCircle className="h-7 w-7" strokeWidth={2} />}
      </button>
    </div>
  );
}
