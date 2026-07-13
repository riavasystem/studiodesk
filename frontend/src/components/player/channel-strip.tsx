"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Circle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { VerticalMeter } from "@/components/player/vertical-meter";
import { TRACK_TYPE_ICONS, TRACK_TYPE_LABELS } from "@/lib/track-types";
import type { ITrack } from "@/hooks/use-tracks";

function dbLabel(db: number): string {
  if (!Number.isFinite(db) || db < -90) return "-∞";
  return db.toFixed(1);
}

interface IChannelStripProps {
  track: ITrack;
  color: string;
  level: number;
  db: number;
  clipping: boolean;
  audible: boolean;
  isPlaying: boolean;
  armed: boolean;
  onToggleArm: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolumeChange: (value: number) => void;
  onPanChange: (value: number) => void;
  onPhaseToggle: () => void;
  onEQChange: (band: { low?: number; mid?: number; high?: number }) => void;
  onCompressorToggle: (enabled: boolean) => void;
  onReverbSendChange: (value: number) => void;
  onRename: (name: string) => void;
}

export function ChannelStrip({
  track,
  color,
  level,
  db,
  clipping,
  audible,
  isPlaying,
  armed,
  onToggleArm,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onPhaseToggle,
  onEQChange,
  onCompressorToggle,
  onReverbSendChange,
  onRename,
}: IChannelStripProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState(track.name);
  const [compressorEnabled, setCompressorEnabled] = useState(false);
  const [eq, setEq] = useState({ low: 0, mid: 0, high: 0 });
  const [send, setSend] = useState(0);

  const commitRename = () => {
    setEditing(false);
    const name = editingName.trim();
    if (name && name !== track.name) onRename(name);
  };

  const TypeIcon = TRACK_TYPE_ICONS[track.track_type] ?? TRACK_TYPE_ICONS.other;
  const typeLabel = TRACK_TYPE_LABELS[track.track_type] ?? "Otro";

  if (collapsed) {
    return (
      <div
        className="flex h-36 w-9 shrink-0 flex-col items-center justify-between rounded-lg border border-white/6 bg-white/1.5 py-2"
        style={{ borderTopColor: color, borderTopWidth: 2 }}
      >
        <button onClick={() => setCollapsed(false)} className="text-white/40 hover:text-white">
          <ChevronDown className="size-3.5" />
        </button>
        <span
          className="flex-1 truncate text-center text-[9px] font-medium text-white/50"
          style={{ writingMode: "vertical-rl" }}
        >
          {track.name}
        </span>
        <Circle
          className="size-2 shrink-0"
          fill={audible && isPlaying ? color : "transparent"}
          stroke={audible && isPlaying ? color : "rgba(255,255,255,0.2)"}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex w-28 shrink-0 flex-col items-center gap-2 rounded-xl border p-2.5 transition-colors ${
        audible && isPlaying ? "border-white/15 bg-linear-to-b from-white/6 to-white/2" : "border-white/6 bg-white/1.5"
      }`}
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <div className="flex w-full items-center justify-between">
        <TypeIcon className="size-3.5 shrink-0" style={{ color }} title={typeLabel} />
        {editing ? (
          <input
            autoFocus
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-16 rounded border border-orange-400/40 bg-black/40 px-1 text-center text-[10px] text-white outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setEditing(true);
              setEditingName(track.name);
            }}
            className="max-w-16 flex-1 truncate text-[10px] font-medium text-white/80 hover:text-white"
            title={`${track.name} · click para renombrar`}
          >
            {track.name}
          </button>
        )}
        <button onClick={() => setCollapsed(true)} className="text-white/30 hover:text-white">
          <ChevronUp className="size-3.5" />
        </button>
      </div>

      <div className="flex w-full items-center gap-1">
        <button
          onClick={onToggleArm}
          title="Arm"
          className={`flex h-5 flex-1 items-center justify-center rounded border font-mono text-[9px] font-bold transition-all ${
            armed ? "border-red-500 bg-red-500/80 text-white" : "border-white/15 text-white/40 hover:text-white/70"
          }`}
        >
          <Circle className="size-2" fill={armed ? "currentColor" : "none"} />
        </button>
        <button
          onClick={onToggleSolo}
          title="Solo"
          className={`flex h-5 flex-1 items-center justify-center rounded border font-mono text-[9px] font-bold transition-all ${
            track.is_solo
              ? "border-amber-400 bg-amber-400 text-black"
              : "border-white/15 text-white/40 hover:text-white/70"
          }`}
        >
          S
        </button>
        <button
          onClick={onToggleMute}
          title="Mute"
          className={`flex h-5 flex-1 items-center justify-center rounded border font-mono text-[9px] font-bold transition-all ${
            track.is_muted
              ? "border-red-500 bg-red-500 text-white"
              : "border-white/15 text-white/40 hover:text-white/70"
          }`}
        >
          M
        </button>
      </div>

      <div className="flex w-full items-center gap-1.5">
        <span className="font-mono text-[8px] text-white/30">L</span>
        <Slider
          className="flex-1"
          min={-1}
          max={1}
          step={0.01}
          value={[track.pan]}
          onValueChange={(value) => onPanChange(Array.isArray(value) ? value[0] : value)}
        />
        <span className="font-mono text-[8px] text-white/30">R</span>
      </div>

      <button
        onClick={onPhaseToggle}
        title="Invertir fase"
        className={`w-full rounded border font-mono text-[9px] font-semibold transition-all ${
          track.is_phase_inverted
            ? "border-sky-400 bg-sky-400/20 text-sky-300"
            : "border-white/10 text-white/30 hover:text-white/60"
        }`}
      >
        Ø
      </button>

      <div className="flex w-full flex-col gap-1 rounded-md border border-white/6 bg-black/20 p-1.5">
        <span className="text-center font-mono text-[8px] tracking-widest text-white/30">EQ</span>
        {(["low", "mid", "high"] as const).map((band) => (
          <div key={band} className="flex items-center gap-1">
            <span className="w-6 font-mono text-[8px] text-white/30 uppercase">{band[0]}</span>
            <Slider
              className="flex-1"
              min={-12}
              max={12}
              step={0.5}
              value={[eq[band]]}
              onValueChange={(value) => {
                const v = Array.isArray(value) ? value[0] : value;
                setEq((prev) => ({ ...prev, [band]: v }));
                onEQChange(band === "low" ? { low: v } : band === "mid" ? { mid: v } : { high: v });
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const next = !compressorEnabled;
          setCompressorEnabled(next);
          onCompressorToggle(next);
        }}
        className={`w-full rounded border font-mono text-[9px] font-semibold transition-all ${
          compressorEnabled
            ? "border-violet-400 bg-violet-400/20 text-violet-300"
            : "border-white/10 text-white/30 hover:text-white/60"
        }`}
      >
        COMP
      </button>

      <div className="flex w-full items-center gap-1.5">
        <span className="font-mono text-[8px] text-white/30">FX</span>
        <Slider
          className="flex-1"
          min={0}
          max={1}
          step={0.01}
          value={[send]}
          onValueChange={(value) => {
            const v = Array.isArray(value) ? value[0] : value;
            setSend(v);
            onReverbSendChange(v);
          }}
        />
      </div>

      <div className="flex h-32 items-stretch gap-1.5">
        <VerticalMeter level={level} active={audible} clipping={clipping} />
        <Slider
          orientation="vertical"
          className="h-full"
          min={0}
          max={2}
          step={0.01}
          value={[track.volume]}
          onValueChange={(value) => onVolumeChange(Array.isArray(value) ? value[0] : value)}
        />
      </div>
      <span className={`font-mono text-[9px] tabular-nums ${clipping ? "text-red-400" : "text-white/40"}`}>
        {dbLabel(db)} dB
      </span>
    </div>
  );
}
