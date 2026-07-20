"use client";

import { toast } from "sonner";
import { ChevronDown, ChevronUp, Copy, X } from "lucide-react";
import { MarkerQuickAdd } from "@/components/player/marker-quick-add";
import { useAppendSequenceItem, useRemoveSequenceItem, useReorderSequence, type ISequenceItem } from "@/hooks/use-sequence";
import type { ISongMarker } from "@/hooks/use-markers";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ISequenceEditorProps {
  songId: number;
  markers: ISongMarker[] | undefined;
  sequenceItems: ISequenceItem[] | undefined;
  currentSequenceIndex: number | null;
  onSeekToIndex: (index: number) => void;
}

export function SequenceEditor({ songId, markers, sequenceItems, currentSequenceIndex, onSeekToIndex }: ISequenceEditorProps) {
  const reorder = useReorderSequence(songId);
  const append = useAppendSequenceItem(songId);
  const remove = useRemoveSequenceItem(songId);

  const items = sequenceItems ?? [];
  const markerById = new Map((markers ?? []).map((m) => [m.id, m]));

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids, { onError: () => toast.error("No se pudo reordenar la secuencia") });
  };

  const duplicateItem = (index: number) => {
    const item = items[index];
    append.mutate(
      { marker_id: item.marker_id, order_index: index + 1 },
      { onError: () => toast.error("No se pudo repetir la sección") },
    );
  };

  const removeItem = (itemId: number) => {
    remove.mutate(itemId, { onError: () => toast.error("No se pudo quitar de la secuencia") });
  };

  if (!markers || markers.length === 0) {
    return (
      <div className="rounded-2xl border border-white/6 bg-black/20 p-6 text-center text-sm text-white/40">
        Sin secciones. Anda a la línea de tiempo para detectar o crear secciones primero.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-black/20 p-4">
      <p className="text-xs font-semibold tracking-wide text-white/50 uppercase">Secuencia de reproducción</p>

      <div className="flex flex-col gap-1.5">
        {items.map((item, index) => {
          const marker = markerById.get(item.marker_id);
          if (!marker) return null;
          const active = index === currentSequenceIndex;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                active ? "border-orange-400/50 bg-orange-400/10" : "border-white/8 bg-white/2"
              }`}
            >
              <button
                onClick={() => onSeekToIndex(index)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: marker.color }} />
                <span className="truncate text-sm font-medium text-white">{marker.label}</span>
                <span className="shrink-0 font-mono text-[10px] text-white/35">
                  {formatTime(marker.position_seconds)}–{formatTime(marker.end_time_seconds ?? 0)}
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  title="Mover arriba"
                  className="rounded p-1 text-white/40 hover:text-white disabled:opacity-20"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  title="Mover abajo"
                  className="rounded p-1 text-white/40 hover:text-white disabled:opacity-20"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  onClick={() => duplicateItem(index)}
                  title="Repetir esta sección aquí"
                  className="rounded p-1 text-white/40 hover:text-orange-300"
                >
                  <Copy className="size-3.5" />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  title="Quitar de la secuencia (no borra la sección)"
                  className="rounded p-1 text-white/40 hover:text-red-400"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/6 pt-3">
        <select
          defaultValue=""
          onChange={(e) => {
            const markerId = Number(e.target.value);
            if (!markerId) return;
            append.mutate({ marker_id: markerId }, { onError: () => toast.error("No se pudo agregar la sección") });
            e.target.value = "";
          }}
          className="h-7 rounded-md border border-white/6 bg-black/30 px-2 text-[11px] text-white outline-none"
        >
          <option value="" className="bg-black">
            Agregar sección existente...
          </option>
          {markers.map((marker) => (
            <option key={marker.id} value={marker.id} className="bg-black">
              {marker.label}
            </option>
          ))}
        </select>

        <MarkerQuickAdd
          songId={songId}
          position={items.length > 0 ? (markerById.get(items[items.length - 1].marker_id)?.end_time_seconds ?? 0) : 0}
          triggerLabel="+ Nueva sección"
          onCreated={(marker) =>
            append.mutate({ marker_id: marker.id }, { onError: () => toast.error("No se pudo agregar la sección") })
          }
        />
      </div>
    </div>
  );
}
