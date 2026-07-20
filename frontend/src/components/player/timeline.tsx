"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock3, Loader2, Minus, Plus, Radio, Wand2, ZoomIn } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrackWaveform } from "@/components/player/track-waveform";
import { MarkerQuickAdd } from "@/components/player/marker-quick-add";
import { useAutoDetectMarkers, useDeleteMarker, useUpdateMarker, type ISongMarker } from "@/hooks/use-markers";
import { useAppendSequenceItem } from "@/hooks/use-sequence";
import type { ISequenceSpan } from "@/hooks/use-multitrack-player";

const MIN_SECTION_SECONDS = 1;

type DragState =
  | { kind: "boundary"; index: number; time: number }
  | { kind: "leading"; time: number }
  | { kind: "trailing"; time: number };

type AddDialogTarget = { kind: "after-marker"; markerId: number } | { kind: "start" } | { kind: "end" };

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
  onSeek: (seconds: number) => void;
  onSeekToSequenceIndex: (index: number) => void;
  onEnableMetronome: () => void;
  editMode: boolean;
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
  onSeek,
  onSeekToSequenceIndex,
  onEnableMetronome,
  editMode,
}: ITimelineProps) {
  const deleteMarker = useDeleteMarker(songId);
  const updateMarker = useUpdateMarker(songId);
  const autoDetect = useAutoDetectMarkers(songId);
  const appendItem = useAppendSequenceItem(songId);

  const [zoom, setZoom] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [addDialogTarget, setAddDialogTarget] = useState<AddDialogTarget | null>(null);
  const [renamingMarkerId, setRenamingMarkerId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  const commitRename = (marker: ISongMarker) => {
    const label = renameDraft.trim();
    setRenamingMarkerId(null);
    if (!label || label === marker.label) return;
    updateMarker.mutate(
      {
        id: marker.id,
        label,
        marker_type: marker.marker_type,
        color: marker.color,
        position_seconds: marker.position_seconds,
        end_time_seconds: marker.end_time_seconds,
        loop_end_seconds: marker.loop_end_seconds,
      },
      { onError: () => toast.error("No se pudo renombrar la sección") },
    );
  };

  const sorted = [...(markers ?? [])].sort((a, b) => a.position_seconds - b.position_seconds);
  const bands = sorted.map((marker, index) => {
    let start = marker.position_seconds;
    let end = marker.end_time_seconds ?? duration;
    // While a boundary/edge handle is being dragged, preview the new split
    // live before anything is persisted (committed on pointer up).
    if (dragState?.kind === "boundary") {
      if (index === dragState.index) end = dragState.time;
      if (index === dragState.index + 1) start = dragState.time;
    } else if (dragState?.kind === "leading" && index === 0) {
      start = dragState.time;
    } else if (dragState?.kind === "trailing" && index === sorted.length - 1) {
      end = dragState.time;
    }
    // Never render (or let a handle sit) beyond the real decoded audio
    // length — a stale end_time_seconds from the DB shouldn't be able to
    // push the trailing handle off-canvas where it can't be grabbed anymore.
    if (duration > 0) {
      end = Math.min(end, duration);
      start = Math.min(start, end);
    }
    const widthPct = duration > 0 ? Math.max(0, ((end - start) / duration) * 100) : 0;
    // A marker's canonical clickable slot is its first chronological occurrence
    // in the sequence — repeats are only individually reachable from the
    // sequence editor panel, where each row is an unambiguous specific slot.
    const sequenceIndex = sequence.findIndex((s) => s.markerId === marker.id);
    return { marker, start, end, widthPct, sequenceIndex, index };
  });

  const playheadPct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const addDialogBand =
    addDialogTarget?.kind === "after-marker" ? (bands.find((b) => b.marker.id === addDialogTarget.markerId) ?? null) : null;

  const handleBandSeek = (sequenceIndex: number, positionSeconds: number) => {
    if (sequenceIndex === -1) {
      onSeek(positionSeconds);
      return;
    }
    onSeekToSequenceIndex(sequenceIndex);
  };

  const handlePlayheadPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const canvasEl = canvasRef.current;
      if (!canvasEl || duration <= 0) return;

      const handleMove = (moveEvent: PointerEvent) => {
        const rect = canvasEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
        onSeek(ratio * duration);
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [duration, onSeek],
  );

  const handleBoundaryPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const canvasEl = canvasRef.current;
      const left = sorted[index];
      const right = sorted[index + 1];
      if (!canvasEl || duration <= 0 || !left || !right) return;

      const minTime = left.position_seconds + MIN_SECTION_SECONDS;
      const maxTime = (right.end_time_seconds ?? duration) - MIN_SECTION_SECONDS;

      const handleMove = (moveEvent: PointerEvent) => {
        const rect = canvasEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
        const time = Math.min(maxTime, Math.max(minTime, ratio * duration));
        setDragState({ kind: "boundary", index, time });
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setDragState((current) => {
          if (current && current.kind === "boundary" && current.index === index) {
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

  const handleLeadingPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const canvasEl = canvasRef.current;
      const first = sorted[0];
      if (!canvasEl || duration <= 0 || !first) return;

      const maxTime = (first.end_time_seconds ?? duration) - MIN_SECTION_SECONDS;

      const handleMove = (moveEvent: PointerEvent) => {
        const rect = canvasEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
        const time = Math.min(maxTime, Math.max(0, ratio * duration));
        setDragState({ kind: "leading", time });
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setDragState((current) => {
          if (current && current.kind === "leading") {
            updateMarker.mutate(
              {
                id: first.id,
                label: first.label,
                marker_type: first.marker_type,
                color: first.color,
                position_seconds: current.time,
                end_time_seconds: first.end_time_seconds,
                loop_end_seconds: first.loop_end_seconds,
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

  const handleTrailingPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const canvasEl = canvasRef.current;
      const last = sorted[sorted.length - 1];
      if (!canvasEl || duration <= 0 || !last) return;

      const minTime = last.position_seconds + MIN_SECTION_SECONDS;

      const handleMove = (moveEvent: PointerEvent) => {
        const rect = canvasEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
        const time = Math.min(duration, Math.max(minTime, ratio * duration));
        setDragState({ kind: "trailing", time });
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        setDragState((current) => {
          if (current && current.kind === "trailing") {
            updateMarker.mutate(
              {
                id: last.id,
                label: last.label,
                marker_type: last.marker_type,
                color: last.color,
                position_seconds: last.position_seconds,
                end_time_seconds: current.time,
                loop_end_seconds: last.loop_end_seconds,
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

  return (
    <div className="rounded-2xl border border-white/6 bg-black/25">
      {/* Toolbar */}
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

      {/* Single canvas: colored sections + waveform + all editing */}
      <div className="overflow-x-auto rounded-b-2xl px-3 py-3">
        <div ref={canvasRef} className="relative">
          {bands.length > 0 ? (
            <div className="absolute inset-0 z-10 flex">
              {bands.map(({ marker, widthPct, start, sequenceIndex }) => {
                const isActive = sequenceIndex !== -1 && sequenceIndex === currentSequenceIndex;
                const isPending = sequenceIndex !== -1 && sequenceIndex === pendingSequenceIndex;
                return (
                  <div
                    key={marker.id}
                    role="button"
                    tabIndex={0}
                    onDoubleClick={() => handleBandSeek(sequenceIndex, start)}
                    title={`${marker.label} · doble click para reproducir a continuación`}
                    className={`group relative h-full shrink-0 cursor-pointer border-r border-white/10 select-none ${
                      isActive ? "ring-2 ring-inset ring-white/80" : ""
                    } ${isPending ? "outline-dashed outline-2 -outline-offset-2 outline-white/60" : ""}`}
                    style={{ width: `${widthPct}%`, backgroundColor: `${marker.color}26` }}
                  >
                    {editMode && renamingMarkerId === marker.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onBlur={() => commitRename(marker)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(marker);
                          if (e.key === "Escape") setRenamingMarkerId(null);
                        }}
                        className="absolute top-1 left-1.5 z-20 w-[calc(100%-0.75rem)] rounded border border-white/30 bg-black/80 px-1 text-[9px] font-semibold text-white uppercase outline-none"
                      />
                    ) : (
                      <span
                        onClick={
                          editMode
                            ? (e) => {
                                e.stopPropagation();
                                setRenameDraft(marker.label);
                                setRenamingMarkerId(marker.id);
                              }
                            : undefined
                        }
                        title={editMode ? "Click para renombrar" : undefined}
                        className={`absolute top-1 left-1.5 flex items-center gap-1 truncate text-[9px] font-semibold tracking-wide uppercase ${editMode ? "cursor-text hover:underline" : ""}`}
                        style={{ color: marker.color, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                      >
                        {marker.label}
                        {isPending && <Clock3 className="size-2.5 shrink-0" />}
                      </span>
                    )}

                    {editMode && (
                      <>
                        <button
                          type="button"
                          title="Eliminar esta sección"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMarker.mutate(marker.id, {
                              onError: () => toast.error("No se pudo eliminar la sección"),
                            });
                          }}
                          className="absolute bottom-1 left-1 z-40 flex size-4 items-center justify-center rounded-full bg-red-500 text-white opacity-90"
                        >
                          <Minus className="size-2.5" />
                        </button>

                        <button
                          type="button"
                          title="Agregar una sección después de esta"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddDialogTarget({ kind: "after-marker", markerId: marker.id });
                          }}
                          className="absolute right-1 bottom-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white opacity-90"
                        >
                          <Plus className="size-2.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="absolute inset-x-0 top-0 z-10 flex h-6 items-center px-1 text-[10px] text-white/25">
              Sin secciones marcadas
            </div>
          )}

          {editMode && bands.length > 0 && (
            <button
              type="button"
              title="Agregar una sección antes de la Intro"
              onClick={() => setAddDialogTarget({ kind: "start" })}
              className="absolute top-1 left-1 z-40 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow"
            >
              <Plus className="size-3" />
            </button>
          )}

          {editMode && bands.length > 0 && (
            <button
              type="button"
              title="Agregar una sección después del Final"
              onClick={() => setAddDialogTarget({ kind: "end" })}
              className="absolute top-1 right-1 z-40 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow"
            >
              <Plus className="size-3" />
            </button>
          )}

          {/* Draggable handles for section boundaries, so they can be resized
              without touching the original audio. Restricted to the top ~65%
              of the canvas — the bottom strip is reserved for each band's
              delete/add buttons, which otherwise sit right where an
              edge-to-edge handle would swallow their clicks. Only shown in
              edit mode to avoid stray edits during playback. */}
          {editMode &&
            bands.slice(0, -1).map((band, index) => {
              const leftPct = duration > 0 ? (band.end / duration) * 100 : 0;
              return (
                <div
                  key={`boundary-${band.marker.id}`}
                  onPointerDown={handleBoundaryPointerDown(index)}
                  title="Arrastrar para mover el límite entre secciones"
                  className="group absolute top-0 z-30 flex h-[65%] w-5 -translate-x-1/2 cursor-col-resize items-center justify-center"
                  style={{ left: `${leftPct}%` }}
                >
                  <div className="h-full w-1 rounded-full bg-white/25 group-hover:bg-white/70" />
                </div>
              );
            })}

          {editMode && bands.length > 0 && (
            <div
              onPointerDown={handleLeadingPointerDown}
              title="Arrastrar para mover el inicio de la primera sección"
              className="group absolute top-0 z-30 flex h-[65%] w-5 -translate-x-1/2 cursor-col-resize items-center justify-center"
              style={{ left: `${duration > 0 ? (bands[0].start / duration) * 100 : 0}%` }}
            >
              <div className="h-full w-1 rounded-full bg-white/25 group-hover:bg-white/70" />
            </div>
          )}

          {editMode && bands.length > 0 && (
            <div
              onPointerDown={handleTrailingPointerDown}
              title="Arrastrar para extender la última sección hasta el final de la canción"
              className="group absolute top-0 z-30 flex h-[65%] w-5 -translate-x-1/2 cursor-col-resize items-center justify-center"
              style={{ left: `${duration > 0 ? (bands[bands.length - 1].end / duration) * 100 : 100}%` }}
            >
              <div className="h-full w-1 rounded-full bg-white/25 group-hover:bg-white/70" />
            </div>
          )}

          {/* Playhead — draggable to scrub the song forward or back */}
          <div
            onPointerDown={handlePlayheadPointerDown}
            title="Arrastrar para adelantar o atrasar la canción"
            className="absolute top-0 bottom-0 z-40 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="pointer-events-none h-full w-px bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
          </div>

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

      <Dialog open={addDialogTarget !== null} onOpenChange={(open) => !open && setAddDialogTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar a la secuencia</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex max-h-96 flex-col gap-1.5 overflow-y-auto">
            <button
              onClick={() => {
                onEnableMetronome();
                setAddDialogTarget(null);
              }}
              className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/5"
            >
              <Radio className="size-3.5 shrink-0 text-white/50" />
              <span className="truncate text-sm font-medium text-white">Click (metrónomo)</span>
            </button>

            {(markers ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-white/40">No hay secciones disponibles.</p>
            )}
            {(markers ?? []).map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  const orderIndex =
                    addDialogTarget?.kind === "start"
                      ? 0
                      : addDialogTarget?.kind === "after-marker" && addDialogBand && addDialogBand.sequenceIndex !== -1
                        ? addDialogBand.sequenceIndex + 1
                        : undefined;
                  appendItem.mutate(
                    { marker_id: option.id, order_index: orderIndex },
                    { onError: () => toast.error("No se pudo agregar la sección") },
                  );
                  setAddDialogTarget(null);
                }}
                className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/5"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                <span className="truncate text-sm font-medium text-white">{option.label}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-white/35">
                  {formatTime(option.position_seconds)}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
