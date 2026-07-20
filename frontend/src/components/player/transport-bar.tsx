"use client";

import { useState } from "react";
import { AlertTriangle, ListMusic, Loader2, Menu, Pause, Pencil, Play, Repeat, Square, SkipBack } from "lucide-react";
import { toast } from "sonner";
import { KEY_NAMES } from "@/lib/music-keys";

export type PlayerPanel = "mixer" | "sequence";

const TIME_SIGNATURE_OPTIONS = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8"];

/** Inline click-to-edit BPM field: this used to be a plain, non-interactive
 * display — clicking it did nothing, which is exactly what was reported.
 * Editing here persists to the song (same field the Click reads its tempo
 * from), so it now actually does something instead of just mirroring a
 * possibly-empty value. */
function BpmField({ bpm, onCommit }: { bpm: number | null; onCommit: (value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(bpm ?? ""));

  const commit = () => {
    setEditing(false);
    const value = Math.round(Number(draft));
    if (Number.isFinite(value) && value > 0 && value !== bpm) onCommit(Math.min(300, Math.max(30, value)));
    else setDraft(String(bpm ?? ""));
  };

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(bpm ?? ""));
            setEditing(false);
          }
        }}
        className="w-16 rounded border border-orange-400/40 bg-black/40 text-center font-mono text-2xl font-bold text-white outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(bpm ?? ""));
        setEditing(true);
      }}
      title="Click para editar el BPM de la canción"
      className="font-mono text-2xl font-bold text-white tabular-nums hover:text-orange-300"
    >
      {bpm ?? "--"}
    </button>
  );
}

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
      className={`flex size-16 items-center justify-center rounded-xl border transition-colors disabled:opacity-30 ${
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
  bpm: number | null;
  onBpmChange: (value: number) => void;
  timeSignature: string;
  onTimeSignatureChange: (value: string) => void;
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
  padOn: boolean;
  onTogglePad: () => void;
  originalKey: string;
  playbackKey: string;
  onPlaybackKeyChange: (value: string) => void;
}

export function TransportBar({
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
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
  padOn,
  onTogglePad,
  originalKey,
  playbackKey,
  onPlaybackKeyChange,
}: ITransportBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-transparent px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_20px_60px_-20px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col items-start gap-0.5 leading-none">
          <BpmField bpm={bpm} onCommit={onBpmChange} />
          <select
            value={timeSignature}
            onChange={(e) => onTimeSignatureChange(e.target.value)}
            title="Compás de la canción"
            className="mt-1 rounded border-none bg-transparent font-mono text-xs text-white/40 outline-none hover:text-orange-300"
          >
            {(TIME_SIGNATURE_OPTIONS.includes(timeSignature) ? TIME_SIGNATURE_OPTIONS : [timeSignature, ...TIME_SIGNATURE_OPTIONS]).map(
              (option) => (
                <option key={option} value={option} className="bg-black">
                  {option}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-5 py-2.5 leading-tight">
          <span className="font-mono text-2xl font-bold tabular-nums text-white">{formatTime(currentTime)}</span>
          <span className="font-mono text-xs tabular-nums text-white/35">
            0:00 / {formatTime(duration)}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
          <select
            value={playbackKey}
            onChange={(e) => onPlaybackKeyChange(e.target.value)}
            title={`Tonalidad original: ${originalKey}. Cambiarla transpone la reproducción en tiempo real, sin alterar el tempo.`}
            className="w-16 rounded border-none bg-transparent text-center font-mono text-lg font-bold text-white/85 outline-none hover:text-orange-300"
          >
            {KEY_NAMES.map((key) => (
              <option key={key} value={key} className="bg-black">
                {key}
              </option>
            ))}
          </select>
          <span className="font-mono text-[10px] tracking-widest text-white/35 uppercase">Tonalidad</span>
        </div>

        <TransportButton onClick={onTogglePad} title="Activar/desactivar el Pad ambiente" active={padOn}>
          <span className="font-mono text-sm font-bold tracking-wide">PAD</span>
        </TransportButton>

        <TransportButton onClick={onRewind} disabled={!isReady} title="Ir al inicio">
          <SkipBack className="size-7" />
        </TransportButton>

        <TransportButton onClick={onPlayPause} disabled={!isReady} title={isPlaying ? "Pausar" : "Reproducir"} active>
          {isPlaying ? <Pause className="size-7" /> : <Play className="size-7" />}
        </TransportButton>

        <TransportButton onClick={onToggleLoop} disabled={!isReady} title="Loop infinito" active={loop}>
          <Repeat className="size-7" />
        </TransportButton>

        <TransportButton onClick={onStop} disabled={!isReady} title="Stop">
          <Square className="size-7" />
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
          className={`flex h-16 items-center gap-2 rounded-xl border px-5 font-mono text-sm font-bold tracking-widest uppercase transition-colors ${
            editMode
              ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
              : "border-white/8 bg-black/30 text-white/60 hover:border-white/20 hover:text-white"
          }`}
        >
          <Pencil className="size-5" />
          Editar
        </button>
        <TransportButton
          onClick={() => onPanelChange("sequence")}
          title="Secuencia de reproducción"
          active={panel === "sequence"}
        >
          <ListMusic className="size-7" />
        </TransportButton>
        <TransportButton onClick={() => toast("No disponible en esta versión")} title="Menú">
          <Menu className="size-7" />
        </TransportButton>
      </div>
    </div>
  );
}
