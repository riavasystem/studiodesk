"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock3, Loader2, Wand2, X, ZoomIn } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { TrackWaveform } from "@/components/player/track-waveform";
import { MarkerQuickAdd } from "@/components/player/marker-quick-add";
import { useAutoDetectMarkers, useDeleteMarker, type ISongMarker } from "@/hooks/use-markers";
import type { ISequenceSpan } from "@/hooks/use-multitrack-player";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ITimelineProps {
  songId: number;
  mainUrl: string | undefined;
  markers: ISongMarker[] | undefined;
  sequence: ISequenceSpan[];
  currentSequenceIndex: number | null;
  pendingSequenceIndex: number | null;
  currentTime: number;
  duration: number;
  loop: boolean;
  onSeek: (seconds: number) => void;
  onSeekToSequenceIndex: (index: number) => void;
  onSetLoop: (value: boolean, start?: number, end?: number) => void;
}

export function Timeline({
  songId,
  mainUrl,
  markers,
  sequence,
  currentSequenceIndex,
  pendingSequenceIndex,
  currentTime,
  duration,
  loop,
  onSeek,
  onSeekToSequenceIndex,
  onSetLoop,
}: ITimelineProps) {
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const deleteMarker = useDeleteMarker(songId);
  const autoDetect = useAutoDetectMarkers(songId);

  const [zoom, setZoom] = useState(0);

  const sorted = [...(markers ?? [])].sort((a, b) => a.position_seconds - b.position_seconds);
  const bands = sorted.map((marker) => {
    const end = marker.end_time_seconds ?? duration;
    const start = marker.position_seconds;
    const widthPct = duration > 0 ? Math.max(0, ((end - start) / duration) * 100) : 0;
    // A marker's canonical clickable slot is its first chronological occurrence
    // in the sequence — repeats are only individually reachable from the
    // sequence editor panel, where each row is an unambiguous specific slot.
    const sequenceIndex = sequence.findIndex((s) => s.markerId === marker.id);
    return { marker, start, widthPct, sequenceIndex };
  });

  const playheadPct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const handleBandClick = (sequenceIndex: number, positionSeconds: number) => {
    if (sequenceIndex === -1) {
      onSeek(positionSeconds);
      return;
    }
    onSeekToSequenceIndex(sequenceIndex);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-black/25">
      {/* Region band ruler */}
      <div className="relative flex h-8 w-full overflow-hidden border-b border-white/6">
        {bands.length > 0 ? (
          bands.map(({ marker, widthPct, start, sequenceIndex }) => {
            const isActive = sequenceIndex !== -1 && sequenceIndex === currentSequenceIndex;
            const isPending = sequenceIndex !== -1 && sequenceIndex === pendingSequenceIndex;
            return (
              <button
                key={marker.id}
                onClick={() => handleBandClick(sequenceIndex, start)}
                className={`group relative flex shrink-0 items-center justify-center overflow-hidden border-r border-black/40 px-1.5 text-[10px] font-semibold tracking-wide uppercase transition-shadow ${
                  isActive ? "ring-2 ring-inset ring-white/80" : ""
                } ${isPending ? "outline-dashed outline-2 outline-offset-[-2px] outline-white/60" : ""}`}
                style={{
                  width: `${widthPct}%`,
                  minWidth: widthPct > 0 ? undefined : 0,
                  backgroundColor: `${marker.color}33`,
                  color: marker.color,
                }}
                title={marker.label}
              >
                <span className="truncate">{marker.label}</span>
                {isPending && <Clock3 className="ml-1 size-2.5 shrink-0" />}
                <X
                  className="absolute top-1 right-1 size-3 opacity-0 group-hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMarker.mutate(marker.id, { onError: () => toast.error("No se pudo borrar el marcador") });
                  }}
                />
              </button>
            );
          })
        ) : (
          <div className="flex flex-1 items-center px-3 text-[10px] text-white/25">Sin secciones marcadas</div>
        )}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-white"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/6 px-3 py-1.5">
        <MarkerQuickAdd songId={songId} position={currentTime} triggerLabel={`Sección en ${formatTime(currentTime)}`} />

        <button
          onClick={() => {
            autoDetect.mutate(undefined, {
              onSuccess: (created) =>
                toast.success(`Se detectaron ${created.length} secciones automáticamente`),
              onError: () => toast.error("No se pudo analizar la estructura de la canción"),
            });
          }}
          disabled={autoDetect.isPending}
          title="Detecta cambios de sección por energía/timbre del audio y crea marcadores editables. Esto reinicia tu secuencia de reproducción personalizada."
          className="flex items-center gap-1 rounded-md border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-[10px] font-medium text-violet-300 hover:border-violet-400/50 disabled:opacity-50"
        >
          {autoDetect.isPending ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
          Detectar secciones
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            onClick={() => setLoopA(currentTime)}
            className={`rounded-md border px-2 py-1 font-mono text-[10px] ${loopA !== null ? "border-cyan-400/50 text-cyan-300" : "border-white/10 text-white/40"}`}
          >
            A {loopA !== null ? formatTime(loopA) : ""}
          </button>
          <button
            onClick={() => setLoopB(currentTime)}
            className={`rounded-md border px-2 py-1 font-mono text-[10px] ${loopB !== null ? "border-cyan-400/50 text-cyan-300" : "border-white/10 text-white/40"}`}
          >
            B {loopB !== null ? formatTime(loopB) : ""}
          </button>
          <button
            onClick={() => {
              if (loopA === null || loopB === null) return;
              onSetLoop(!loop, Math.min(loopA, loopB), Math.max(loopA, loopB));
            }}
            disabled={loopA === null || loopB === null}
            className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-mono text-[10px] text-cyan-300 disabled:opacity-30"
          >
            Loop A-B
          </button>
          <div className="h-4 w-px bg-white/10" />
          <ZoomIn className="size-3.5 text-white/30" />
          <Slider
            className="w-24"
            min={0}
            max={200}
            step={5}
            value={[zoom]}
            onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto px-3 py-3">
        <div className="relative">
          {/* Colored section overlays directly on the waveform canvas */}
          {bands.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex">
              {bands.map(({ marker, widthPct }) => (
                <div
                  key={marker.id}
                  className="relative h-full shrink-0 border-r border-white/10"
                  style={{ width: `${widthPct}%`, backgroundColor: `${marker.color}26` }}
                >
                  <span
                    className="absolute top-1 left-1.5 truncate text-[9px] font-semibold tracking-wide uppercase"
                    style={{ color: marker.color, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                  >
                    {marker.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
            style={{ left: `${playheadPct}%` }}
          />

          {mainUrl && (
            <TrackWaveform
              url={mainUrl}
              currentTime={currentTime}
              duration={duration}
              isMuted={false}
              onSeek={onSeek}
              height={64}
              zoom={zoom}
            />
          )}
        </div>
      </div>
    </div>
  );
}
