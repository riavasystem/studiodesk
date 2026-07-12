"use client";

import { Slider } from "@/components/ui/slider";
import { VerticalMeter } from "@/components/player/vertical-meter";

function dbLabel(db: number): string {
  if (!Number.isFinite(db) || db < -90) return "-∞";
  return db.toFixed(1);
}

interface IMasterStripProps {
  volume: number;
  level: number;
  db: number;
  clipping: boolean;
  isPlaying: boolean;
  onVolumeChange: (value: number) => void;
}

export function MasterStrip({ volume, level, db, clipping, isPlaying, onVolumeChange }: IMasterStripProps) {
  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/2 p-2.5">
      <span className="font-mono text-[10px] font-bold tracking-widest text-white/60">MASTER</span>

      <div className="flex w-full flex-col items-center gap-0.5 rounded-md border border-white/6 bg-black/20 px-1.5 py-1">
        <span className="font-mono text-[8px] tracking-widest text-white/30">LUFS ~</span>
        <span className={`font-mono text-[11px] tabular-nums ${clipping ? "text-red-400" : "text-white/60"}`}>
          {dbLabel(db)}
        </span>
      </div>

      <div className="flex h-40 items-stretch gap-1.5">
        <VerticalMeter level={level} active={isPlaying} clipping={clipping} />
        <Slider
          orientation="vertical"
          className="h-full"
          min={0}
          max={1.5}
          step={0.01}
          value={[volume]}
          onValueChange={(value) => onVolumeChange(Array.isArray(value) ? value[0] : value)}
        />
      </div>

      <span
        className={`w-full rounded border py-0.5 text-center font-mono text-[9px] font-semibold ${
          clipping
            ? "border-red-500 bg-red-500/20 text-red-400"
            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        }`}
      >
        LIMITER
      </span>
    </div>
  );
}
