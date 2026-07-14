"use client";

const SCALE_LABELS = ["10", "0", "-10", "-20", "-30", "-40", "-50", "-60"];

export function FaderScale() {
  return (
    <div className="relative h-full w-4 shrink-0">
      {SCALE_LABELS.map((label, i) => (
        <span
          key={label}
          className="absolute right-0 -translate-y-1/2 font-mono text-[6.5px] leading-none text-white/30 tabular-nums"
          style={{ top: `${(i / (SCALE_LABELS.length - 1)) * 94 + 3}%` }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
