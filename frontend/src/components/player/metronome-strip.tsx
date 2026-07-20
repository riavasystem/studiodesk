"use client";

import { useState } from "react";
import { Radio, Settings } from "lucide-react";
import { Fader } from "@/components/player/fader";
import { FaderScale } from "@/components/player/fader-scale";
import { VerticalMeter } from "@/components/player/vertical-meter";
import {
  METRONOME_SOUND_OPTIONS,
  METRONOME_SUBDIVISION_OPTIONS,
  type MetronomeSoundId,
  type MetronomeSubdivision,
} from "@/lib/multitrack-engine";

function dbLabel(db: number): string {
  if (!Number.isFinite(db) || db < -90) return "-∞";
  return db.toFixed(1);
}

interface IMetronomeStripProps {
  color: string;
  displayVolume: number;
  level: number;
  db: number;
  clipping: boolean;
  isOn: boolean;
  isPlaying: boolean;
  sound: MetronomeSoundId;
  subdivision: MetronomeSubdivision;
  onToggleOn: () => void;
  onVolumeChange: (value: number) => void;
  onSoundChange: (id: MetronomeSoundId) => void;
  onSubdivisionChange: (id: MetronomeSubdivision) => void;
}

export function MetronomeStrip({
  color,
  displayVolume,
  level,
  db,
  clipping,
  isOn,
  isPlaying,
  sound,
  subdivision,
  onToggleOn,
  onVolumeChange,
  onSoundChange,
  onSubdivisionChange,
}: IMetronomeStripProps) {
  const [expanded, setExpanded] = useState(false);

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
        <button
          onClick={() => setExpanded((v) => !v)}
          title="Configuración del metrónomo"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
            expanded ? "text-white/80" : "text-white/30 hover:text-white/60"
          }`}
        >
          <Settings className="size-3" />
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
        Click
      </span>

      {expanded && (
        <div className="flex w-full flex-col items-center gap-2 px-2 pt-1">
          <div className="flex w-full flex-col gap-1 rounded-md border border-white/6 bg-black/20 p-1.5">
            <span className="text-center font-mono text-[8px] tracking-widest text-white/30 uppercase">Subdivisión</span>
            <div className="flex w-full gap-1">
              {METRONOME_SUBDIVISION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onSubdivisionChange(option.id)}
                  className={`flex-1 rounded border py-0.5 font-mono text-[9px] font-semibold transition-all ${
                    subdivision === option.id
                      ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                      : "border-white/10 text-white/40 hover:text-white/70"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col gap-1 rounded-md border border-white/6 bg-black/20 p-1.5">
            <span className="text-center font-mono text-[8px] tracking-widest text-white/30 uppercase">Sonido</span>
            {METRONOME_SOUND_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => onSoundChange(option.id)}
                className={`w-full rounded border py-0.5 font-mono text-[9px] font-semibold transition-all ${
                  sound === option.id
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                    : "border-white/10 text-white/40 hover:text-white/70"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
