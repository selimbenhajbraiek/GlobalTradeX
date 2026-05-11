"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ enabled, onFinalText, canListen }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(SpeechRecognition));
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
    setInterimText("");
  }, []);

  const start = useCallback(() => {
    if (!enabled || !supported || listening) return;
    if (canListen && !canListen()) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim.trim());
      if (finalText.trim()) {
        onFinalText?.(finalText.trim());
        setInterimText("");
      }
    };
    recognition.onerror = () => {
      stop();
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [canListen, enabled, listening, onFinalText, stop, supported]);

  useEffect(() => {
    if (!enabled) {
      stop();
    }
    return () => stop();
  }, [enabled, stop]);

  return {
    supported,
    listening,
    interimText,
    start,
    stop,
    toggle: listening ? stop : start,
  };
}
