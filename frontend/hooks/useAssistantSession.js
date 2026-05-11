"use client";

import Cookies from "js-cookie";
import { useCallback, useEffect, useRef, useState } from "react";

import { assistantApi, resolvedApiBaseUrl } from "@/lib/api";

function toWsUrl(baseUrl) {
  const trimmed = (baseUrl || "").replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("https://")) return `${trimmed.replace("https://", "wss://")}/api/assistant/ws`;
  if (trimmed.startsWith("http://")) return `${trimmed.replace("http://", "ws://")}/api/assistant/ws`;
  return `ws://${trimmed}/api/assistant/ws`;
}

export function useAssistantSession({ enabled, userRole, recentShipments }) {
  const [sessionId, setSessionId] = useState(null);
  const [state, setState] = useState("connecting");
  const [lastReply, setLastReply] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);
  const useSocketRef = useRef(true);

  const closeSocket = useCallback(() => {
    const socket = wsRef.current;
    wsRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: "end" }));
      } catch {
        /* ignore */
      }
      socket.close();
    }
  }, []);

  const startRestSession = useCallback(async () => {
    const { data } = await assistantApi.startSession({
      user_role: userRole || "user",
      recent_shipments: recentShipments || [],
    });
    setSessionId(data.session_id);
    setState("idle");
  }, [recentShipments, userRole]);

  const connectSocket = useCallback(() => {
    const token = Cookies.get("token");
    if (!token) {
      setError("Sign in required.");
      setState("idle");
      return;
    }

    const wsUrl = `${toWsUrl(resolvedApiBaseUrl)}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    setState("connecting");
    setError("");

    socket.onopen = () => {
      setState("idle");
    };

    socket.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const type = payload.type;
      if (type === "session_started") {
        setSessionId(payload.session_id);
        setState(payload.state || "idle");
        if (payload.greeting) {
          setHistory([{ role: "assistant", content: payload.greeting, media: { text: payload.greeting } }]);
        }
        return;
      }
      if (type === "state") {
        setState(payload.state || "idle");
        return;
      }
      if (type === "response_partial") {
        setLastReply(payload);
        setHistory((items) => {
          const next = [...items];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last?.partial) {
            next[next.length - 1] = { role: "assistant", content: payload.text || "", media: payload, partial: true };
            return next;
          }
          return [...next, { role: "assistant", content: payload.text || "", media: payload, partial: true }];
        });
        setState(payload.state || "speaking");
        return;
      }
      if (type === "response") {
        setLastReply(payload);
        setHistory((items) => {
          const next = [...items];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last?.partial) {
            next[next.length - 1] = { role: "assistant", content: payload.text || "", media: payload };
            return next;
          }
          return [...next, { role: "assistant", content: payload.text || "", media: payload }];
        });
        setState(payload.state || "speaking");
        return;
      }
      if (type === "error") {
        setError(payload.message || "Assistant error");
      }
    };

    socket.onerror = () => {
      useSocketRef.current = false;
      closeSocket();
      startRestSession().catch((err) => {
        setError(err?.message || "Could not start assistant session.");
        setState("idle");
      });
    };

    socket.onclose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };
  }, [closeSocket, startRestSession]);

  useEffect(() => {
    if (!enabled) {
      closeSocket();
      setSessionId(null);
      setState("idle");
      setLastReply(null);
      setHistory([]);
      setError("");
      return;
    }

    useSocketRef.current = true;
    connectSocket();
    return () => {
      closeSocket();
      if (sessionId) {
        assistantApi.endSession(sessionId).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const sendMessage = useCallback(
    async (content) => {
      const text = (content || "").trim();
      if (!text) return;

      setHistory((items) => [...items, { role: "user", content: text }]);
      setError("");
      setState("listening");

      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "message", content: text }));
        return;
      }

      if (!sessionId) {
        setError("Assistant session is not ready.");
        setState("idle");
        return;
      }

      setState("thinking");
      try {
        const { data } = await assistantApi.sendMessage(sessionId, {
          message: text,
          include_avatar: true,
          include_audio: true,
        });
        setLastReply(data);
        setHistory((items) => [...items, { role: "assistant", content: data.text, media: data }]);
        setState(data.state || "speaking");
      } catch (err) {
        setError(err?.message || "Message failed.");
        setState("idle");
      }
    },
    [sessionId]
  );

  const endSession = useCallback(async () => {
    closeSocket();
    if (sessionId) {
      try {
        await assistantApi.endSession(sessionId);
      } catch {
        /* ignore */
      }
    }
    setSessionId(null);
    setState("idle");
    setLastReply(null);
    setHistory([]);
  }, [closeSocket, sessionId]);

  return {
    sessionId,
    state,
    lastReply,
    history,
    error,
    sendMessage,
    endSession,
  };
}
