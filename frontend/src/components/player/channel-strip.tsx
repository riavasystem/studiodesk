"use client";

import { useState } from "react";
import { Circle, Pencil, Settings, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Fader } from "@/components/player/fader";
import { FaderScale } from "@/components/player/fader-scale";
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
  displayVolume: number;
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
  onDelete: () => void;
}

export function ChannelStrip({
  track,
  color,
  displayVolume,
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
  onDelete,
}: IChannelStripProps) {
  const [expanded, setExpanded] = useState(false);
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

  return (
    <div
      className={`flex min-w-20 flex-1 basis-24 flex-col items-center gap-2 rounded-lg border pt-0 pb-2.5 transition-colors ${
        audible && isPlaying ? "border-white/15 bg-linear-to-b from-white/6 to-white/2" : "border-white/6 bg-white/2"
      }`}
    >
      {/* Large instrument icon, above the track */}
      <div
        className="flex w-full items-center justify-center rounded-t-[7px] py-2.5"
        style={{ backgroundColor: `${color}1a`, borderBottom: `1px solid ${color}55` }}
      >
        <span title={typeLabel} className="flex size-9 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22` }}>
          <TypeIcon className="size-5" style={{ color }} />
        </span>
      </div>

      {/* S + M + advanced toggle */}
      <div className="flex w-full items-center gap-1 px-2">
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
        <button
          onClick={() => setExpanded((v) => !v)}
          title="Controles avanzados"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
            expanded ? "text-white/80" : "text-white/30 hover:text-white/60"
          }`}
        >
          <Settings className="size-3" />
        </button>
      </div>

      <div className="flex h-36 w-full items-stretch justify-center gap-1 px-1.5">
        <VerticalMeter level={level} active={audible} clipping={clipping} />
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

      {/* Name plate */}
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
          className="w-[90%] rounded border border-orange-400/40 bg-black/40 px-1 text-center text-[10px] text-white outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setEditing(true);
            setEditingName(track.name);
          }}
          className="flex w-[90%] items-center justify-center gap-1 truncate text-center text-[10.5px] font-semibold uppercase"
          style={{ color }}
          title={`${track.name} · click para renombrar`}
        >
          <span className="truncate">{track.name}</span>
          <Pencil className="size-2.5 shrink-0 opacity-50" />
        </button>
      )}

      {expanded && (
        <div className="flex w-full flex-col items-center gap-2 px-2 pt-1">
          <button
            onClick={onToggleArm}
            title="Arm"
            className={`flex h-5 w-full items-center justify-center gap-1 rounded border font-mono text-[9px] font-bold transition-all ${
              armed ? "border-red-500 bg-red-500/80 text-white" : "border-white/15 text-white/40 hover:text-white/70"
            }`}
          >
            <Circle className="size-2" fill={armed ? "currentColor" : "none"} /> ARM
          </button>

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

          <button
            onClick={() => {
              if (window.confirm(`¿Eliminar la pista "${track.name}"? Esta acción no se puede deshacer.`)) onDelete();
            }}
            title="Eliminar esta pista"
            className="flex w-full items-center justify-center gap-1 rounded border border-red-500/25 py-1 font-mono text-[9px] font-semibold text-red-400/70 transition-all hover:border-red-500/50 hover:text-red-400"
          >
            <Trash2 className="size-2.5" /> ELIMINAR
          </button>
        </div>
      )}
    </div>
  );
}
