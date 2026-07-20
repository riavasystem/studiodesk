"use client";

import { useState } from "react";
import { AlertTriangle, ListMusic, Loader2, Menu, Pause, Pencil, Play, Repeat, Square, SkipBack } from "lucide-react";
import { toast } from "sonner";

export type PlayerPanel = "mixer" | "sequence";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TransportButton({
  onClick,
  disabled,
  title,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex size-12 items-center justify-center rounded-xl border transition-colors disabled:opacity-30 ${
        active
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
          : "border-white/8 bg-black/30 text-white/70 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

interface ITransportBarProps {
  title: string;
  artist: string;
  bpm: number | null;
  timeSignature: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isReady: boolean;
  loop: boolean;
  isLoading: boolean;
  loadError: string | null;
  loadedTracks: number;
  totalTracks: number;
  panel: PlayerPanel;
  onPanelChange: (panel: PlayerPanel) => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onRewind: () => void;
  onToggleLoop: () => void;
}

export function TransportBar({
  title,
  artist,
  bpm,
  timeSignature,
  currentTime,
  duration,
  isPlaying,
  isReady,
  loop,
  isLoading,
  loadError,
  loadedTracks,
  totalTracks,
  panel,
  onPanelChange,
  editMode,
  onToggleEditMode,
  onPlayPause,
  onStop,
  onRewind,
  onToggleLoop,
}: ITransportBarProps) {
  const [padOn, setPadOn] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-transparent px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_20px_60px_-20px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col items-start leading-none">
          <span className="font-mono text-xl font-bold text-white tabular-nums">{bpm ?? "--"}</span>
          <span className="mt-1 font-mono text-[11px] text-white/40">{timeSignature}</span>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-4 py-1.5 leading-tight">
          <span className="font-mono text-lg font-bold tabular-nums text-white">{formatTime(currentTime)}</span>
          <span className="font-mono text-[10px] tabular-nums text-white/35">
            0:00 / {formatTime(duration)}
          </span>
        </div>

        <TransportButton onClick={() => setPadOn((v) => !v)} title="Pad" active={padOn}>
          <span className="font-mono text-xs font-bold tracking-wide">PAD</span>
        </TransportButton>

        <TransportButton onClick={onRewind} disabled={!isReady} title="Ir al inicio">
          <SkipBack className="size-5" />
        </TransportButton>

        <TransportButton onClick={onPlayPause} disabled={!isReady} title={isPlaying ? "Pausar" : "Reproducir"} active>
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
        </TransportButton>

        <TransportButton onClick={onToggleLoop} disabled={!isReady} title="Loop infinito" active={loop}>
          <Repeat className="size-5" />
        </TransportButton>

        <TransportButton onClick={onStop} disabled={!isReady} title="Stop">
          <Square className="size-5" />
        </TransportButton>

        {isLoading && (
          <div className="flex items-center gap-2.5 rounded-xl border border-orange-400/50 bg-orange-400/15 px-4 py-2.5 shadow-[0_0_20px_rgba(255,138,31,0.2)]">
            <Loader2 className="size-5 animate-spin text-orange-400" />
            <span className="font-mono text-sm font-bold text-orange-300 tabular-nums">
              Cargando pistas {loadedTracks}/{totalTracks}
            </span>
          </div>
        )}
        {loadError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5">
            <AlertTriangle className="size-3.5 text-red-400" />
            <span className="text-[11px] text-red-300">{loadError}</span>
          </div>
        )}

        <div className="min-w-0 flex-1" />

        <button
          onClick={onToggleEditMode}
          title="Editar la estructura de la canción: insertar, quitar y mover secciones"
          className={`flex items-center gap-1.5 rounded-xl border px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase transition-colors ${
            editMode
              ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
              : "border-white/8 bg-black/30 text-white/60 hover:border-white/20 hover:text-white"
          }`}
        >
          <Pencil className="size-3.5" />
          Editar
        </button>
        <TransportButton
          onClick={() => onPanelChange("sequence")}
          title="Secuencia de reproducción"
          active={panel === "sequence"}
        >
          <ListMusic className="size-5" />
        </TransportButton>
        <TransportButton onClick={() => toast("No disponible en esta versión")} title="Menú">
          <Menu className="size-5" />
        </TransportButton>
      </div>

      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-white/45">{artist}</p>
      </div>
    </div>
  );
}
