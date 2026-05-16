"use client";

export function AiWaveform({ active = false, bars = 32 }) {
  return (
    <div className="flex h-10 items-end justify-center gap-0.5 px-4" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-kinetic transition-all ${
            active ? "animate-pulse" : "opacity-40"
          }`}
          style={{
            height: active ? `${12 + ((i * 7) % 24)}px` : "6px",
            animationDelay: active ? `${i * 40}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}
