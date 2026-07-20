"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useCreateMarker, MARKER_TYPE_COLORS, type ISongMarker, type MarkerType } from "@/hooks/use-markers";

export const MARKER_TYPE_OPTIONS: MarkerType[] = [
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

interface IMarkerQuickAddProps {
  songId: number;
  position: number;
  triggerLabel: string;
  onCreated?: (marker: ISongMarker) => void;
}

/** Small inline "create a new section" form, shared by the timeline (creates
 * a raw section at the current playhead) and the sequence editor (creates a
 * new section and appends it to the playback sequence). */
export function MarkerQuickAdd({ songId, position, triggerLabel, onCreated }: IMarkerQuickAddProps) {
  const createMarker = useCreateMarker(songId);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<MarkerType>("cue");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:border-orange-400/30 hover:text-orange-300"
      >
        <Plus className="size-3" /> {triggerLabel}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as MarkerType)}
        className="h-6 rounded-md border border-white/6 bg-black/30 px-1 text-[11px] text-white outline-none"
      >
        {MARKER_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option} className="bg-black">
            {option}
          </option>
        ))}
      </select>
      <input
        autoFocus
        className="h-6 w-28 rounded-md border border-white/6 bg-black/30 px-2 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
        placeholder="Nombre..."
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
      <button
        onClick={() => {
          createMarker.mutate(
            {
              label: label || type,
              marker_type: type,
              color: MARKER_TYPE_COLORS[type],
              position_seconds: position,
            },
            {
              onSuccess: (marker) => onCreated?.(marker),
              onError: () => toast.error("No se pudo crear la sección"),
            },
          );
          setLabel("");
          setOpen(false);
        }}
        className="rounded-md border border-orange-400/40 bg-orange-400/15 px-2 py-1 text-[10px] font-semibold text-orange-300"
      >
        Guardar
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/40"
      >
        Cancelar
      </button>
    </div>
  );
}
