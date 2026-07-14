"use client";

import { SlidersVertical } from "lucide-react";
import { Fader } from "@/components/player/fader";
import { FaderScale } from "@/components/player/fader-scale";
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
    <div className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-lg border border-white/12 bg-linear-to-b from-white/6 to-white/2 pt-0 pb-2.5">
      <div className="flex w-full flex-col items-center gap-1.5 rounded-t-[7px] border-b border-orange-400/40 bg-orange-400/10 py-2.5">
        <span title="Ecualizador" className="flex size-9 items-center justify-center rounded-full bg-orange-400/20">
          <SlidersVertical className="size-5 text-orange-300" />
        </span>
        <span className="font-mono text-[10px] font-bold tracking-widest text-orange-300">MASTER</span>
      </div>

      <div className="flex h-36 w-full items-stretch justify-center gap-1 px-1.5">
        <VerticalMeter level={level} active={isPlaying} clipping={clipping} />
        <FaderScale />
        <Fader value={volume} min={0} max={1.5} accent="#ff8a1f" onChange={onVolumeChange} />
      </div>

      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums ${
          clipping ? "bg-red-500/20 text-red-400" : "bg-black/30 text-white/45"
        }`}
      >
        {dbLabel(db)}
      </span>

      <span
        className={`w-[88%] rounded border py-0.5 text-center font-mono text-[9px] font-semibold ${
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
