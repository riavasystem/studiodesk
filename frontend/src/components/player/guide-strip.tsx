"use client";

import { Mic2 } from "lucide-react";
import { Fader } from "@/components/player/fader";
import { FaderScale } from "@/components/player/fader-scale";

interface IGuideStripProps {
  color: string;
  volume: number;
  isOn: boolean;
  isPlaying: boolean;
  onToggleOn: () => void;
  onVolumeChange: (value: number) => void;
}

/** Voice guide (GUIA): announces each section's name via the browser's
 * speech synthesis, not Tone.js — so unlike the other strips there's no
 * real audio node to meter here, just an on/off toggle and its volume. */
export function GuideStrip({ color, volume, isOn, isPlaying, onToggleOn, onVolumeChange }: IGuideStripProps) {
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
        <span title="Guía de voz" className="flex size-9 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22` }}>
          <Mic2 className="size-5" style={{ color }} />
        </span>
      </div>

      <div className="flex w-full items-center gap-1 px-2">
        <button
          title="Solo (no disponible para la guía)"
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
        <FaderScale />
        <Fader value={volume} min={0} max={1} accent={color} onChange={onVolumeChange} />
      </div>

      <span className="flex w-[90%] items-center justify-center gap-1 truncate text-center text-[10.5px] font-semibold uppercase" style={{ color }}>
        Guía
      </span>
    </div>
  );
}
