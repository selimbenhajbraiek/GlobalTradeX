"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload, Video } from "lucide-react";

import { adminAvatarsApi } from "@/lib/api";

const ACCENT = "#533AB7";
const SURFACE = "#EEEDFE";

function statusLabel(status) {
  switch (status) {
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "error":
      return "Error";
    default:
      return "Not created";
  }
}

export function AvatarAssistantSetup() {
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminAvatarsApi.current();
      setAvatar(data || null);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not load avatar status.");
      setAvatar(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  useEffect(() => {
    if (!avatar?.id || !["processing", "not_created"].includes(avatar.status)) {
      return undefined;
    }
    const timer = window.setInterval(async () => {
      try {
        const { data } = await adminAvatarsApi.getById(avatar.id);
        setAvatar(data);
      } catch {
        /* ignore polling errors */
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [avatar?.id, avatar?.status]);

  useEffect(() => {
    if (!avatar?.id) {
      setPreviewUrl("");
      return undefined;
    }
    let objectUrl = "";
    adminAvatarsApi
      .preview(avatar.id)
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        setPreviewUrl(objectUrl);
      })
      .catch(() => setPreviewUrl(""));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatar?.id, avatar?.status]);

  async function submitVideo(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file, file.name || "avatar.webm");
      const { data } = await adminAvatarsApi.create(formData);
      setAvatar(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Avatar creation failed.");
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(event) {
    const file = event.target.files?.[0];
    if (file) submitVideo(file);
  }

  async function startRecording() {
    if (recording) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const file = new File([blob], "admin-avatar.webm", { type: blob.type || "video/webm" });
        await submitVideo(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(err?.message || "Camera access was denied.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecording(false);
  }

  return (
    <section
      className="rounded-3xl border p-6 shadow-sm"
      style={{ borderColor: `${ACCENT}33`, backgroundColor: SURFACE }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: ACCENT }}>
            Avatar Assistant Setup
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">
            Create your talking assistant
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Record or upload a short video of yourself. GlobalTradeX will turn it into the platform
            assistant that answers user questions with video and voice.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
        >
          Status: {loading ? "Loading…" : statusLabel(avatar?.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-violet-200/70 bg-white/80 p-4">
            <p className="text-sm font-medium text-slate-800">Capture or upload</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {recording ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {recording ? "Stop recording" : "Record from webcam"}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                <Upload className="h-4 w-4" />
                Upload video
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Keep the clip under 50MB. A clear face, good lighting, and a short greeting work best.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            Create My Avatar
          </button>

          {avatar?.error_message ? (
            <p className="text-sm text-red-600">{avatar.error_message}</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="rounded-2xl border border-violet-200/70 bg-slate-950 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-200">Preview</p>
          <div className="mt-3 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
            {previewUrl ? (
              <video key={previewUrl} src={previewUrl} controls className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Record or upload a video to preview your assistant source clip.
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>Persona: friendly, concise, platform expert.</p>
            <p>Voice: configured TTS voice when D-ID or ElevenLabs keys are set.</p>
            {avatar?.avatar_provider_id ? (
              <p>Provider avatar id: {avatar.avatar_provider_id}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
