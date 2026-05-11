"use client";

export function AvatarStage({
  speaking,
  thinking,
  listening,
  videoUrl,
  caption,
  previewImageUrl,
  previewVideoUrl,
  avatarName,
}) {
  if (videoUrl) {
    return (
      <div className="relative aspect-[16/11] w-full overflow-hidden rounded-3xl border border-line bg-black shadow-2xl">
        <video
          key={videoUrl}
          src={videoUrl}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          controls={false}
        />
        {caption ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
            <p className="text-center text-sm leading-relaxed text-white">{caption}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-3xl border border-line bg-black shadow-2xl">
      {previewVideoUrl ? (
        <video
          src={previewVideoUrl}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : previewImageUrl ? (
        <img src={previewImageUrl} alt={avatarName || "Assistant avatar"} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-brass/20" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {avatarName || "Live support"}
      </div>
      <div
        className={`pointer-events-none absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-medium backdrop-blur ${
          listening
            ? "border border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
            : speaking || thinking
              ? "border border-brass/40 bg-brass/20 text-brass"
              : "border border-white/15 bg-black/40 text-white/80"
        }`}
      >
        {listening ? "Listening" : speaking ? "Speaking" : thinking ? "Thinking" : "On call"}
      </div>

      {caption ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12">
          <p className="text-center text-sm leading-relaxed text-white">{caption}</p>
        </div>
      ) : null}
    </div>
  );
}
