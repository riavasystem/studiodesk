"use client";

import { Waves } from "lucide-react";
import { Fader } from "@/components/player/fader";
import { FaderScale } from "@/components/player/fader-scale";
import { VerticalMeter } from "@/components/player/vertical-meter";

function dbLabel(db: number): string {
  if (!Number.isFinite(db) || db < -90) return "-∞";
  return db.toFixed(1);
}

interface IPadStripProps {
  color: string;
  displayVolume: number;
  level: number;
  db: number;
  clipping: boolean;
  isOn: boolean;
  isPlaying: boolean;
  onToggleOn: () => void;
  onVolumeChange: (value: number) => void;
}

export function PadStrip({ color, displayVolume, level, db, clipping, isOn, isPlaying, onToggleOn, onVolumeChange }: IPadStripProps) {
  return (
    <div
      className={`flex min-w-20 flex-1 basis-24 flex-col items-center gap-2 rounded-lg border pt-0 pb-2.5 transition-colors ${
        isOn && isPlaying ? "border-white/15 bg-linear-to-b from-white/6 to-white/2" : "border-white/6 bg-white/2"
      }`}
    >
      <div
        className="flex w-full items-center justify-center rounded-t-[7px] py-2.5"
        style={{ backgroundColor: `${color}1a`, borderBottom: `1px solid ${color}55` }}
      >
        <span title="Pad ambiente" className="flex size-9 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22` }}>
          <Waves className="size-5" style={{ color }} />
        </span>
      </div>

      <div className="flex w-full items-center gap-1 px-2">
        <button
          title="Solo (no disponible para el pad)"
          disabled
          className="flex h-5 flex-1 items-center justify-center rounded border border-white/15 font-mono text-[9px] font-bold text-white/25"
        >
          S
        </button>
        <button
          onClick={onToggleOn}
          title="Mute"
          className={`flex h-5 flex-1 items-center justify-center rounded border font-mono text-[9px] font-bold transition-all ${
            !isOn ? "border-red-500 bg-red-500 text-white" : "border-white/15 text-white/40 hover:text-white/70"
          }`}
        >
          M
        </button>
      </div>

      <div className="flex h-36 w-full items-stretch justify-center gap-1 px-1.5">
        <VerticalMeter level={level} active={isOn} clipping={clipping} />
        <FaderScale />
        <Fader value={displayVolume} min={0} max={2} accent={color} onChange={onVolumeChange} />
      </div>

      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums ${
          clipping ? "bg-red-500/20 text-red-400" : "bg-emerald-400/8 text-white/50"
        }`}
      >
        {dbLabel(db)}
      </span>

      <span className="flex w-[90%] items-center justify-center gap-1 truncate text-center text-[10.5px] font-semibold uppercase" style={{ color }}>
        Pad
      </span>
    </div>
  );
}
