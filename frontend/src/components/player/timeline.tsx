"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock3, Loader2, Minus, Plus, Wand2, ZoomIn } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { TrackWaveform } from "@/components/player/track-waveform";
import { MarkerQuickAdd } from "@/components/player/marker-quick-add";
import { useAutoDetectMarkers, useDeleteMarker, useUpdateMarker, type ISongMarker } from "@/hooks/use-markers";
import { useAppendSequenceItem } from "@/hooks/use-sequence";
import type { ISequenceSpan } from "@/hooks/use-multitrack-player";

const MIN_SECTION_SECONDS = 1;

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
  const updateMarker = useUpdateMarker(songId);
  const autoDetect = useAutoDetectMarkers(songId);
  const appendItem = useAppendSequenceItem(songId);

  const [zoom, setZoom] = useState(0);
  const [dragBoundary, setDragBoundary] = useState<{ index: number; time: number } | null>(null);
  const [addMenuFor, setAddMenuFor] = useState<number | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const sorted = [...(markers ?? [])].sort((a, b) => a.position_seconds - b.position_seconds);
  const bands = sorted.map((marker, index) => {
    const rawStart = marker.position_seconds;
    const rawEnd = marker.end_time_seconds ?? duration;
    // While a boundary handle is being dragged, preview the new split live on
    // both sides of it before anything is persisted (committed on pointer up).
    const start = dragBoundary && index === dragBoundary.index + 1 ? dragBoundary.time : rawStart;
    const end = dragBoundary && index === dragBoundary.index ? dragBoundary.time : rawEnd;
    const widthPct = duration > 0 ? Math.max(0, ((end - start) / duration) * 100) : 0;
    // A marker's canonical clickable slot is its first chronological occurrence
    // in the sequence — repeats are only individually reachable from the
    // sequence editor panel, where each row is an unambiguous specific slot.
    const sequenceIndex = sequence.findIndex((s) => s.markerId === marker.id);
    return { marker, start, end, widthPct, sequenceIndex, index };
  });

  const playheadPct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const handleBandSeek = (sequenceIndex: number, positionSeconds: number) => {
    if (sequenceIndex === -1) {
      onSeek(positionSeconds);
      return;
    }
    onSeekToSequenceIndex(sequenceIndex);
  };

  const handleBoundaryPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const rulerEl = rulerRef.current;
      const left = sorted[index];
      const right = sorted[index + 1];
      if (!rulerEl || duration <= 0 || !left || !right) return;

      const minTime = left.position_seconds + MIN_SECTION_SECONDS;
      const maxTime = (right.end_time_seconds ?? duration) - MIN_SECTION_SECONDS;

      const handleMove = (moveEvent: PointerEvent) => {
        const rect = rulerEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
        const time = Math.min(maxTime, Math.max(minTime, ratio * duration));
        setDragBoundary({ index, time });
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setDragBoundary((current) => {
          if (current && current.index === index) {
            updateMarker.mutate(
              {
                id: left.id,
                label: left.label,
                marker_type: left.marker_type,
                color: left.color,
                position_seconds: left.position_seconds,
                end_time_seconds: current.time,
                loop_end_seconds: left.loop_end_seconds,
              },
              { onError: () => toast.error("No se pudo mover el límite de la sección") },
            );
            updateMarker.mutate(
              {
                id: right.id,
                label: right.label,
                marker_type: right.marker_type,
                color: right.color,
                position_seconds: current.time,
                end_time_seconds: right.end_time_seconds,
                loop_end_seconds: right.loop_end_seconds,
              },
              { onError: () => toast.error("No se pudo mover el límite de la sección") },
            );
          }
          return null;
        });
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [sorted, duration, updateMarker],
  );

  useEffect(() => {
    if (addMenuFor === null) return;
    // Clicks on the trigger or inside the popover stopPropagation, so this
    // only ever fires for genuine outside clicks.
    const close = () => setAddMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [addMenuFor]);

  return (
    <div className="rounded-2xl border border-white/6 bg-black/25">
      {/* Toolbar — kept above the section canvas so it doesn't split the
          colored ruler from the waveform it labels. */}
      <div className="flex flex-wrap items-center gap-2 rounded-t-2xl border-b border-white/6 px-3 py-1.5">
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

      {/* Region band ruler */}
      <div ref={rulerRef} className="relative flex h-8 w-full overflow-x-hidden border-b border-white/6">
        {bands.length > 0 ? (
          bands.map(({ marker, widthPct, start, sequenceIndex }) => {
            const isActive = sequenceIndex !== -1 && sequenceIndex === currentSequenceIndex;
            const isPending = sequenceIndex !== -1 && sequenceIndex === pendingSequenceIndex;
            return (
              <div
                key={marker.id}
                role="button"
                tabIndex={0}
                onDoubleClick={() => handleBandSeek(sequenceIndex, start)}
                title={`${marker.label} · doble click para reproducir a continuación`}
                className={`group relative flex shrink-0 items-center justify-center overflow-visible border-r border-black/40 px-1.5 text-[10px] font-semibold tracking-wide uppercase transition-shadow select-none ${
                  isActive ? "ring-2 ring-inset ring-white/80" : ""
                } ${isPending ? "outline-dashed outline-2 outline-offset-[-2px] outline-white/60" : ""}`}
                style={{
                  width: `${widthPct}%`,
                  minWidth: widthPct > 0 ? undefined : 0,
                  backgroundColor: `${marker.color}33`,
                  color: marker.color,
                }}
              >
                <span className="truncate">{marker.label}</span>
                {isPending && <Clock3 className="ml-1 size-2.5 shrink-0" />}

                <button
                  type="button"
                  title="Eliminar esta sección"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMarker.mutate(marker.id, { onError: () => toast.error("No se pudo eliminar la sección") });
                  }}
                  className="absolute bottom-1 left-1 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-90"
                >
                  <Minus className="size-2.5" />
                </button>

                <button
                  type="button"
                  title="Agregar una sección después de esta"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddMenuFor((prev) => (prev === marker.id ? null : marker.id));
                  }}
                  className="absolute right-1 bottom-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 text-white opacity-0 group-hover:opacity-90"
                >
                  <Plus className="size-2.5" />
                </button>

                {addMenuFor === marker.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 z-40 mt-1 max-h-40 w-40 overflow-y-auto rounded-md border border-white/10 bg-black/95 p-1 text-left normal-case shadow-xl"
                  >
                    {(markers ?? []).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          appendItem.mutate(
                            { marker_id: option.id, order_index: sequenceIndex !== -1 ? sequenceIndex + 1 : undefined },
                            { onError: () => toast.error("No se pudo agregar la sección") },
                          );
                          setAddMenuFor(null);
                        }}
                        className="block w-full truncate rounded px-2 py-1 text-left text-[10px] font-normal tracking-normal text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-1 items-center px-3 text-[10px] text-white/25">Sin secciones marcadas</div>
        )}

        {/* Draggable handles between adjacent sections, so their shared
            boundary can be resized without touching the original audio. */}
        {bands.slice(0, -1).map((band, index) => {
          const leftPct = duration > 0 ? (band.end / duration) * 100 : 0;
          return (
            <div
              key={`boundary-${band.marker.id}`}
              onPointerDown={handleBoundaryPointerDown(index)}
              title="Arrastrar para mover el límite entre secciones"
              className="absolute top-0 bottom-0 z-30 w-2 -translate-x-1/2 cursor-col-resize hover:bg-white/30"
              style={{ left: `${leftPct}%` }}
            />
          );
        })}

        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-white"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      <div className="overflow-x-auto rounded-b-2xl px-3 py-3">
        <div className="relative">
          {/* Colored section overlays directly on the waveform canvas. When
              sections exist, this layer intercepts clicks so a double-click
              anywhere on a section defers to the sequence logic exactly like
              the ruler above — a plain single click on the waveform would
              otherwise seek WaveSurfer immediately, skipping the deferral. */}
          {bands.length > 0 && (
            <div className="absolute inset-0 z-10 flex">
              {bands.map(({ marker, widthPct, start, sequenceIndex }) => (
                <div
                  key={marker.id}
                  role="button"
                  tabIndex={-1}
                  onDoubleClick={() => handleBandSeek(sequenceIndex, start)}
                  title={`${marker.label} · doble click para reproducir a continuación`}
                  className="relative h-full shrink-0 cursor-pointer border-r border-white/10 select-none"
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
