"use client";

const SEGMENT_COUNT = 12;

interface ILevelMeterProps {
  level: number;
  active: boolean;
}

function segmentColor(index: number, total: number): string {
  const ratio = index / total;
  if (ratio > 0.85) return "bg-red-500";
  if (ratio > 0.65) return "bg-amber-400";
  return "bg-orange-500/80";
}

export function LevelMeter({ level, active }: ILevelMeterProps) {
  const litCount = Math.round(Math.min(Math.max(level, 0), 1) * SEGMENT_COUNT);

  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
        const lit = active && i < litCount;
        return (
          <div
            key={i}
            className={`w-1 flex-1 rounded-[1px] transition-all duration-75 ${
              lit ? segmentColor(i, SEGMENT_COUNT) : "bg-white/[0.06]"
            }`}
            style={{
              height: `${((i + 1) / SEGMENT_COUNT) * 100}%`,
              boxShadow: lit ? "0 0 6px rgba(255,138,31,0.55)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
