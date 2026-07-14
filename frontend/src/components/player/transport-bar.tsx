"use client";

import { AlertTriangle, Loader2, ListMusic, MicVocal, Pause, Play, Repeat, Rewind, Settings, SlidersHorizontal, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type PlayerPanel = "mixer" | "lyrics";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  onPlayPause,
  onStop,
  onRewind,
  onToggleLoop,
}: ITransportBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-transparent px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_20px_60px_-20px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-white tabular-nums">{bpm ?? "--"}</span>
          <span className="font-mono text-[9px] tracking-widest text-white/35 uppercase">bpm</span>
        </div>
        <span className="rounded-md border border-white/6 bg-black/30 px-1.5 py-1 font-mono text-[11px] text-white/55">
          {timeSignature}
        </span>
      </div>

      <div className="h-9 w-px bg-white/8" />

      <div className="flex flex-col items-center rounded-md border border-white/6 bg-black/30 px-2.5 py-1 leading-tight">
        <span className="font-mono text-sm font-bold tabular-nums text-white">{formatTime(currentTime)}</span>
        <span className="font-mono text-[10px] tabular-nums text-white/35">{formatTime(duration)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-white/45">{artist}</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-black/30 px-3 py-1.5">
          <Loader2 className="size-3.5 animate-spin text-orange-400" />
          <span className="font-mono text-[11px] text-white/50 tabular-nums">
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

      <div className="flex items-center gap-1.5 rounded-xl border border-white/6 bg-black/30 p-1.5 shadow-inner">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          onClick={onRewind}
          disabled={!isReady}
          title="Ir al inicio"
        >
          <Rewind className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          onClick={onStop}
          disabled={!isReady}
          title="Stop"
        >
          <Square className="size-4" />
        </Button>
        <Button
          size="icon"
          className="rounded-full bg-orange-500 text-black shadow-[0_0_16px_rgba(255,138,31,0.45)] hover:bg-orange-400"
          onClick={onPlayPause}
          disabled={!isReady}
          title={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={`rounded-lg ${
            loop
              ? "bg-orange-500/20 text-orange-400 shadow-[0_0_10px_rgba(255,138,31,0.3)]"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
          onClick={onToggleLoop}
          disabled={!isReady}
          title="Loop infinito"
        >
          <Repeat className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-white/6 bg-black/20 p-1">
        <button
          onClick={() => onPanelChange("mixer")}
          title="Mixer"
          className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
            panel === "mixer" ? "bg-orange-500/20 text-orange-400" : "text-white/50 hover:bg-white/8 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="size-4" />
        </button>
        <button
          onClick={() => onPanelChange("lyrics")}
          title="Letras y acordes"
          className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
            panel === "lyrics" ? "bg-orange-500/20 text-orange-400" : "text-white/50 hover:bg-white/8 hover:text-white"
          }`}
        >
          <MicVocal className="size-4" />
        </button>
        <div className="mx-0.5 h-5 w-px bg-white/10" />
        <button
          onClick={() => toast("No disponible en esta versión")}
          title="Repertorio"
          className="flex size-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white/70"
        >
          <ListMusic className="size-4" />
        </button>
        <button
          onClick={() => toast("No disponible en esta versión")}
          title="Ajustes"
          className="flex size-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white/70"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </div>
  );
}
