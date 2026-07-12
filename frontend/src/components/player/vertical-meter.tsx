"use client";

const SEGMENT_COUNT = 16;

interface IVerticalMeterProps {
  level: number;
  active: boolean;
}

function segmentColor(index: number, total: number): string {
  const ratio = index / total;
  if (ratio > 0.85) return "bg-red-500";
  if (ratio > 0.65) return "bg-amber-400";
  return "bg-orange-500/80";
}

export function VerticalMeter({ level, active }: IVerticalMeterProps) {
  const litCount = Math.round(Math.min(Math.max(level, 0), 1) * SEGMENT_COUNT);

  return (
    <div className="flex h-full w-1.5 flex-col-reverse gap-[2px]" aria-hidden>
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
  );
}
