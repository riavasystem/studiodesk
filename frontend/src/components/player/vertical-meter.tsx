"use client";

const SEGMENT_COUNT = 16;

interface IVerticalMeterProps {
  level: number;
  active: boolean;
  clipping?: boolean;
}

function segmentColor(index: number, total: number): string {
  const ratio = index / total;
  if (ratio > 0.85) return "bg-red-500";
  if (ratio > 0.65) return "bg-amber-400";
  return "bg-orange-500/80";
}

export function VerticalMeter({ level, active, clipping = false }: IVerticalMeterProps) {
  const litCount = Math.round(Math.min(Math.max(level, 0), 1) * SEGMENT_COUNT);

  return (
    <div className="flex h-full flex-col items-center gap-1" aria-hidden>
      <span
        className={`size-1.5 shrink-0 rounded-full transition-colors ${
          clipping ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]" : "bg-white/8"
        }`}
      />
      <div className="flex w-1.5 flex-1 flex-col-reverse gap-0.5">
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
          const lit = active && i < litCount;
          return (
            <div
              key={i}
              className={`w-full flex-1 rounded-[1px] transition-all duration-75 ${
                lit ? segmentColor(i, SEGMENT_COUNT) : "bg-white/6"
              }`}
              style={{ boxShadow: lit ? "0 0 5px rgba(255,138,31,0.55)" : undefined }}
            />
          );
        })}
      </div>
    </div>
  );
}
