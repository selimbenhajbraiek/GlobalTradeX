"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Mic, MicOff, PhoneOff, Send, Sparkles } from "lucide-react";

import { AvatarStage } from "@/components/assistant/AvatarStage";
import { useAuth } from "@/context/AuthContext";
import { useAssistant } from "@/context/AssistantContext";
import { useAssistantSession } from "@/hooks/useAssistantSession";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { avatarApi, shipmentsApi } from "@/lib/api";

const QUICK_PROMPTS = [
  "How do I track a shipment?",
  "What does in_transit mean?",
  "How do I create a shipment?",
  "Why is my shipment delayed?",
];

function normalizeRole(role) {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "value" in role) return String(role.value);
  return "";
}

function stateLabel(state) {
  switch (state) {
    case "connecting":
      return "Connecting…";
    case "listening":
      return "Listening…";
    case "thinking":
      return "Assistant is thinking...";
    case "speaking":
      return "Speaking…";
    default:
      return "Idle";
  }
}

export function VideoAssistantModal() {
  const { open, closeAssistant } = useAssistant();
  const { user } = useAuth();
  const pathname = usePathname();
  const role = normalizeRole(user?.role);

  const [input, setInput] = useState("");
  const [recentShipments, setRecentShipments] = useState([]);
  const [micSupported, setMicSupported] = useState(false);
  const [assistantAvailability, setAssistantAvailability] = useState(null);
  const [avatarProfile, setAvatarProfile] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [liveCall, setLiveCall] = useState(true);
  const audioRef = useRef(null);
  const speechRef = useRef(null);

  const shipmentIdFromPath = useMemo(() => {
    const match = pathname?.match(/^\/dashboard\/shipments\/(\d+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const loadContext = useCallback(async () => {
    try {
      const { data } = await shipmentsApi.getAll(role === "admin" ? {} : { mine_only: true });
      const list = Array.isArray(data) ? data : [];
      let mapped = list.slice(0, 5).map((shipment) => ({
        id: shipment.id,
        reference: shipment.reference,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        transport_mode: shipment.transport_mode,
      }));
      if (shipmentIdFromPath) {
        const existing = mapped.find((item) => String(item.id) === String(shipmentIdFromPath));
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
                ...mapped.filter((item) => String(item.id) !== String(one.id)),
              ].slice(0, 5);
            }
          } catch {
            /* ignore */
          }
        }
      }
      setRecentShipments(mapped);
    } catch {
      setRecentShipments([]);
    }
  }, [role, shipmentIdFromPath]);

  const { state, lastReply, history, error, sendMessage, endSession } = useAssistantSession({
    enabled: open,
    userRole: role,
    recentShipments,
  });

  const submitMessage = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;
      setInput("");
      await sendMessage(trimmed);
    },
    [sendMessage]
  );

  const canListen = useCallback(() => state === "idle" || state === "listening", [state]);

  const speech = useSpeechRecognition({
    enabled: open && liveCall,
    canListen,
    onFinalText: submitMessage,
  });

  useEffect(() => {
    if (!open) return;
    loadContext();
    avatarApi
      .status()
      .then(({ data }) => setAssistantAvailability(data))
      .catch(() =>
        setAssistantAvailability({
          available: false,
          message: "Assistant temporarily unavailable",
        })
      );
    avatarApi
      .profile()
      .then(({ data }) => setAvatarProfile(data))
      .catch(() => setAvatarProfile(null));
  }, [open, loadContext]);

  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      if (event.key === "Escape") closeAssistant();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeAssistant]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMicSupported(speech.supported);
  }, [speech.supported]);

  const { start: startListening, stop: stopListening, supported: speechSupported } = speech;

  useEffect(() => {
    if (!open || !liveCall || !speechSupported) return;
    if (state === "idle") {
      startListening();
    } else if (state === "thinking" || state === "speaking") {
      stopListening();
    }
  }, [liveCall, open, speechSupported, startListening, stopListening, state]);

  const playReply = useCallback((reply) => {
    if (!reply) return;
    if (reply.video_url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      window.speechSynthesis?.cancel();
      return;
    }

    if (reply.audio_base64) {
      const mime = reply.mime_type || "audio/mpeg";
      const src = `data:${mime};base64,${reply.audio_base64}`;
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.src = src;
      audio.onended = () => {
        speechRef.current = null;
      };
      audio.play().catch(() => {
        /* fallback below */
      });
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window && reply.text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reply.text);
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    if (lastReply?.audio_base64 || (lastReply?.text && !lastReply?.video_url)) {
      playReply(lastReply);
    }
  }, [lastReply, playReply]);

  useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    }
  }, [open]);

  function onSubmit(event) {
    event.preventDefault();
    submitMessage(input);
  }

  function toggleLiveCall() {
    const next = !liveCall;
    setLiveCall(next);
    if (!next) {
      speech.stop();
    }
  }

  async function handleEndCall() {
    speech.stop();
    await endSession();
    closeAssistant();
  }

  if (!open) return null;

  const speaking = state === "speaking";
  const thinking = state === "thinking";
  const listening = state === "listening" || speech.listening;
  const videoUrl = lastReply?.video_url || null;
  const caption =
    speech.interimText ||
    lastReply?.text ||
    history[history.length - 1]?.content ||
    "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={closeAssistant}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI video assistant"
        className={`grid w-full gap-4 rounded-3xl border border-line bg-panel p-4 shadow-lift md:grid-cols-[1.2fr_0.8fr] md:p-6 ${
          fullscreen ? "max-w-[min(96vw,1200px)]" : "max-w-5xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-mist">AI Video Assistant</p>
              <h3 className="font-display text-2xl font-semibold text-[var(--text)]">Get Help</h3>
              <p className="mt-1 text-sm text-mist">
                Speak naturally like a video call. {avatarProfile?.avatar_name || "Your support agent"} listens, then replies on camera.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFullscreen((value) => !value)}
                className="rounded-full border border-line px-3 py-1 text-xs text-mist hover:text-[var(--text)]"
              >
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
              <span className="rounded-full border border-brass/30 bg-brass/10 px-3 py-1 text-xs font-medium text-brass">
                {stateLabel(state)}
              </span>
            </div>
          </div>

          {assistantAvailability && !assistantAvailability.available ? (
            <p className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {assistantAvailability.message || "Assistant temporarily unavailable"}
            </p>
          ) : null}

          <AvatarStage
            speaking={speaking}
            thinking={thinking}
            listening={listening}
            videoUrl={videoUrl}
            caption={caption}
            previewImageUrl={avatarProfile?.preview_image_url}
            previewVideoUrl={avatarProfile?.preview_video_url}
            avatarName={avatarProfile?.avatar_name}
          />

          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full border border-line bg-rail px-3 py-1.5 text-xs text-mist transition hover:border-brass/40 hover:text-[var(--text)]"
                onClick={() => submitMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="flex min-h-[420px] flex-col rounded-2xl border border-line bg-rail/40">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Sparkles className="h-4 w-4 text-brass" />
            <p className="text-sm font-medium text-[var(--text)]">Conversation</p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {history.length === 0 ? (
              <p className="text-sm text-mist">
                Start with a quick prompt or use the microphone. Answers stay short and actionable.
              </p>
            ) : null}
            {history.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    item.role === "user"
                      ? "bg-brass text-ink"
                      : "border border-line bg-panel text-[var(--text)]"
                  }`}
                >
                  {item.content}
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="px-4 pb-2 text-xs text-red-400">{error}</p> : null}

          <form onSubmit={onSubmit} className="border-t border-line p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLiveCall}
                disabled={!micSupported}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                  liveCall
                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                    : "border-line bg-panel text-mist hover:text-[var(--text)]"
                }`}
                aria-label={liveCall ? "Mute live listening" : "Enable live listening"}
              >
                {liveCall ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              <input
                className="input-field min-w-0 flex-1 text-sm"
                placeholder="Type your question…"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button type="submit" className="btn-primary px-3 py-2 text-sm">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="border-t border-line p-4">
            <button type="button" onClick={handleEndCall} className="btn-ghost w-full justify-center gap-2">
              <PhoneOff className="h-4 w-4" />
              End call
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
