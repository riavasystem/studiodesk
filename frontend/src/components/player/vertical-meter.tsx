"use client";

interface IVerticalMeterProps {
  level: number;
  active: boolean;
  clipping?: boolean;
}

export function VerticalMeter({ level, active, clipping = false }: IVerticalMeterProps) {
  const pct = active ? Math.round(Math.min(Math.max(level, 0), 1) * 100) : 0;

  return (
    <div className="relative h-full w-1.25 shrink-0 overflow-hidden rounded-full bg-white/8">
      <div
        className="absolute bottom-0 left-0 w-full rounded-full transition-[height] duration-75"
        style={{
          height: `${pct}%`,
          backgroundImage: "linear-gradient(to top, #22c55e 0%, #22c55e 62%, #facc15 82%, #ef4444 100%)",
        }}
      />
      {clipping && (
        <div className="absolute top-0 left-0 h-1 w-full rounded-t-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
      )}
    </div>
  );
}
