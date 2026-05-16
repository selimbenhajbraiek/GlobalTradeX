"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Sparkles, Volume2 } from "lucide-react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { aiApi, shipmentsApi } from "@/lib/api";
import { AI_QUICK_PROMPTS, VOICE_LANGUAGES } from "@/lib/intelligence-data";

import { AiWaveform } from "./AiWaveform";

function normalizeRole(role) {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "value" in role) return String(role.value);
  return "";
}

export function AIAssistantPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const role = normalizeRole(user?.role);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [recentShipments, setRecentShipments] = useState([]);
  const [voiceLang, setVoiceLang] = useState("EN");
  const [liveCaption, setLiveCaption] = useState("");
  const bottomRef = useRef(null);

  const loadContext = useCallback(async () => {
    try {
      const { data } = await shipmentsApi.getAll(role === "admin" ? {} : { mine_only: true });
      const list = Array.isArray(data) ? data : [];
      setRecentShipments(
        list.slice(0, 5).map((s) => ({
          id: s.id,
          reference: s.reference,
          origin: s.origin,
          destination: s.destination,
          status: s.status,
          transport_mode: s.transport_mode,
        }))
      );
    } catch {
      setRecentShipments([]);
    }
  }, [role]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    const delayed = recentShipments.filter((s) => s.status === "delayed");
    if (delayed.length) {
      setLiveCaption(
        `${delayed.length} shipment${delayed.length > 1 ? "s" : ""} delayed — ask for rerouting options.`
      );
    } else if (recentShipments.length) {
      setLiveCaption(
        `Tracking ${recentShipments.length} active shipment${recentShipments.length > 1 ? "s" : ""} on your ledger.`
      );
    }
  }, [recentShipments]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendText = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;
      setError("");
      setLiveCaption("Thinking…");
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
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
        const reply = data?.response ?? "I could not generate a response.";
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        setLiveCaption(reply.length > 120 ? `${reply.slice(0, 117)}…` : reply);
      } catch {
        setError("Assistant unavailable. Try again shortly.");
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Sorry — I could not reach TradeFlow AI right now." },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [messages, recentShipments, role]
  );

  const { listening, supported, start, stop } = useSpeechRecognition({
    enabled: true,
    onFinalText: (text) => {
      if (text?.trim()) sendText(text.trim());
    },
  });

  const listeningLabel = useMemo(() => {
    const lang = VOICE_LANGUAGES.find((l) => l.code === voiceLang);
    return listening ? `Listening · ${voiceLang}` : `Ready · ${lang?.label || voiceLang}`;
  }, [listening, voiceLang]);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Intelligence</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">TradeFlow AI</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Voice-first logistics copilot — re-route, file, summarize, and act on live shipment data.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-[#0a1628] text-background shadow-paper">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kinetic text-kinetic-foreground">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium">TradeFlow AI</p>
                <p className="text-[11px] text-white/60">{listeningLabel}</p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-white/40">v4.2 · live</span>
          </div>

          <div className="relative flex min-h-[320px] flex-col items-center justify-center px-6 py-10">
            <div
              className="absolute inset-0 bg-gradient-to-b from-kinetic/20 via-transparent to-black/40"
              aria-hidden
            />
            <div className="relative flex h-40 w-40 items-center justify-center">
              <span
                className={`absolute h-32 w-32 rounded-full border border-kinetic/30 ${
                  listening ? "animate-ping" : ""
                }`}
                aria-hidden
              />
              <span
                className="absolute h-24 w-24 rounded-full border border-white/20"
                aria-hidden
              />
              <span className="relative grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-3 w-3 rounded-full bg-kinetic shadow-[0_0_12px_rgba(59,130,246,0.8)] ${
                      listening ? "animate-pulse" : ""
                    }`}
                    style={{ animationDelay: `${i * 150}ms` }}
                    aria-hidden
                  />
                ))}
              </span>
            </div>
            <p className="relative mt-8 max-w-md rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-sm leading-relaxed text-white/90 backdrop-blur-sm">
              &ldquo;{liveCaption}&rdquo;
            </p>
          </div>

          <AiWaveform active={listening || typing} />

          <form
            className="flex items-center gap-2 border-t border-white/10 bg-black/30 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              sendText(input);
            }}
          >
            <button
              type="button"
              onClick={() => (listening ? stop() : start())}
              disabled={!supported}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                listening
                  ? "border-kinetic bg-kinetic text-kinetic-foreground"
                  : "border-white/20 text-white/80 hover:bg-white/10"
              }`}
              aria-label={listening ? "Stop listening" : "Start voice input"}
            >
              <Mic className="h-4 w-4" aria-hidden />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything — re-route, file, summarize…"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus-visible:ring-2 focus-visible:ring-kinetic"
            />
            <button
              type="submit"
              disabled={typing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kinetic text-kinetic-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              aria-label="Send"
            >
              {typing ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-paper">
            <p className="eyebrow !text-[10px]">Conversation</p>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={`${i}-${m.role}`} className={m.role === "user" ? "text-end" : ""}>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">
                    {m.role === "user" ? "You" : "AI"}
                  </p>
                  <div
                    className={`mt-1 inline-block max-w-[95%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-muted text-foreground"
                        : "border border-kinetic/20 bg-kinetic/5 text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {typing ? <p className="text-xs text-muted-foreground">AI is typing…</p> : null}
              <div ref={bottomRef} />
            </div>
            {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-paper">
            <p className="eyebrow !text-[10px]">Quick prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {AI_QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => sendText(p)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-kinetic/40 hover:bg-kinetic/5"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-paper">
            <div className="flex items-start justify-between gap-2">
              <p className="eyebrow !text-[10px]">Voice · multilingual</p>
              <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Currently speaking {VOICE_LANGUAGES.find((l) => l.code === voiceLang)?.label || "English"}.
              Switch any time.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {VOICE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setVoiceLang(lang.code)}
                  className={`rounded-md border py-2 font-mono text-xs transition-colors ${
                    voiceLang === lang.code
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {lang.code}
                </button>
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground">
              UI locale: {locale.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


