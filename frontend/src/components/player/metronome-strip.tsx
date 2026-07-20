"use client";

import { Radio } from "lucide-react";
import { Fader } from "@/components/player/fader";
import { FaderScale } from "@/components/player/fader-scale";
import { VerticalMeter } from "@/components/player/vertical-meter";

function dbLabel(db: number): string {
  if (!Number.isFinite(db) || db < -90) return "-∞";
  return db.toFixed(1);
}

interface IMetronomeStripProps {
  color: string;
  volume: number;
  level: number;
  db: number;
  clipping: boolean;
  isOn: boolean;
  isPlaying: boolean;
  tempo: number;
  onToggleOn: () => void;
  onVolumeChange: (value: number) => void;
  onTempoChange: (value: number) => void;
}

export function MetronomeStrip({
  color,
  volume,
  level,
  db,
  clipping,
  isOn,
  isPlaying,
  tempo,
  onToggleOn,
  onVolumeChange,
  onTempoChange,
}: IMetronomeStripProps) {
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
        <span title="Click / Metrónomo" className="flex size-9 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22` }}>
          <Radio className="size-5" style={{ color }} />
        </span>
      </div>

      <div className="flex w-full items-center gap-1 px-2">
        <button
          title="Solo (no disponible para el metrónomo)"
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
        <Fader value={volume} min={0} max={2} accent={color} onChange={onVolumeChange} />
      </div>

      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums ${
          clipping ? "bg-red-500/20 text-red-400" : "bg-emerald-400/8 text-white/50"
        }`}
      >
        {dbLabel(db)}
      </span>

      <span className="flex w-[90%] items-center justify-center gap-1 truncate text-center text-[10.5px] font-semibold uppercase" style={{ color }}>
        Click
      </span>

      <div className="flex w-full flex-col items-center gap-1 px-2 pt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTempoChange(Math.max(0.5, +(tempo - 0.01).toFixed(2)))}
            title="Más lento"
            className="flex size-4 items-center justify-center rounded border border-white/12 text-[10px] text-white/50 hover:text-white"
          >
            −
          </button>
          <span className="w-10 text-center font-mono text-[10px] font-bold text-white/85 tabular-nums">
            {Math.round(tempo * 100)}%
          </span>
          <button
            onClick={() => onTempoChange(Math.min(1.5, +(tempo + 0.01).toFixed(2)))}
            title="Más rápido"
            className="flex size-4 items-center justify-center rounded border border-white/12 text-[10px] text-white/50 hover:text-white"
          >
            +
          </button>
        </div>
        <span className="font-mono text-[8px] tracking-widest text-white/30 uppercase">Tempo</span>
      </div>
    </div>
  );
}
