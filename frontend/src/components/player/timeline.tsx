"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, ZoomIn } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { TrackWaveform } from "@/components/player/track-waveform";
import { useCreateMarker, useDeleteMarker, MARKER_TYPE_COLORS, type ISongMarker, type MarkerType } from "@/hooks/use-markers";

const MARKER_TYPE_OPTIONS: MarkerType[] = [
  "intro",
  "verse",
  "prechorus",
  "chorus",
  "bridge",
  "solo",
  "outro",
  "ending",
  "cue",
  "click",
];

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
  currentTime: number;
  duration: number;
  loop: boolean;
  onSeek: (seconds: number) => void;
  onSetLoop: (value: boolean, start?: number, end?: number) => void;
}

export function Timeline({ songId, mainUrl, markers, currentTime, duration, loop, onSeek, onSetLoop }: ITimelineProps) {
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const createMarker = useCreateMarker(songId);
  const deleteMarker = useDeleteMarker(songId);

  const [markerLabel, setMarkerLabel] = useState("");
  const [markerType, setMarkerType] = useState<MarkerType>("cue");
  const [addingMarker, setAddingMarker] = useState(false);
  const [zoom, setZoom] = useState(0);

  const sorted = [...(markers ?? [])].sort((a, b) => a.position_seconds - b.position_seconds);
  const bands =
    duration > 0
      ? sorted.map((marker, i) => {
          const end = i + 1 < sorted.length ? sorted[i + 1].position_seconds : duration;
          const start = marker.position_seconds;
          return { marker, start, widthPct: Math.max(0, ((end - start) / duration) * 100) };
        })
      : [];

  const playheadPct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-black/25">
      {/* Region band ruler */}
      <div className="relative flex h-8 w-full overflow-hidden border-b border-white/6">
        {bands.length > 0 ? (
          bands.map(({ marker, widthPct }) => (
            <button
              key={marker.id}
              onClick={() => onSeek(marker.position_seconds)}
              className="group relative flex shrink-0 items-center justify-center overflow-hidden border-r border-black/40 px-1.5 text-[10px] font-semibold tracking-wide uppercase"
              style={{
                width: `${widthPct}%`,
                minWidth: widthPct > 0 ? undefined : 0,
                backgroundColor: `${marker.color}33`,
                color: marker.color,
              }}
              title={marker.label}
            >
              <span className="truncate">{marker.label}</span>
              <X
                className="absolute top-1 right-1 size-3 opacity-0 group-hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMarker.mutate(marker.id, { onError: () => toast.error("No se pudo borrar el marcador") });
                }}
              />
            </button>
          ))
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
        {addingMarker ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={markerType}
              onChange={(e) => setMarkerType(e.target.value as MarkerType)}
              className="h-6 rounded-md border border-white/6 bg-black/30 px-1 text-[11px] text-white outline-none"
            >
              {MARKER_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type} className="bg-black">
                  {type}
                </option>
              ))}
            </select>
            <input
              autoFocus
              className="h-6 w-28 rounded-md border border-white/6 bg-black/30 px-2 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
              placeholder="Nombre..."
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAddingMarker(false)}
            />
            <button
              onClick={() => {
                createMarker.mutate(
                  {
                    label: markerLabel || markerType,
                    marker_type: markerType,
                    color: MARKER_TYPE_COLORS[markerType],
                    position_seconds: currentTime,
                  },
                  { onError: () => toast.error("No se pudo crear el marcador") },
                );
                setMarkerLabel("");
                setAddingMarker(false);
              }}
              className="rounded-md border border-orange-400/40 bg-orange-400/15 px-2 py-1 text-[10px] font-semibold text-orange-300"
            >
              Guardar
            </button>
            <button
              onClick={() => setAddingMarker(false)}
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/40"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingMarker(true)}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:border-orange-400/30 hover:text-orange-300"
          >
            <Plus className="size-3" /> Sección en {formatTime(currentTime)}
          </button>
        )}

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
  );
}
