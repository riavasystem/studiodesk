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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Parses "m:ss" or a plain number of seconds; returns null if unparsable. */
function parseTime(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

interface IMarkerQuickAddProps {
  songId: number;
  position: number;
  triggerLabel: string;
  onCreated?: (marker: ISongMarker) => void;
}

/** Small inline "create a new section" form, shared by the timeline (defaults
 * to the current playhead, but the time is freely editable before saving) and
 * the sequence editor (creates a new section and appends it to the sequence). */
export function MarkerQuickAdd({ songId, position, triggerLabel, onCreated }: IMarkerQuickAddProps) {
  const createMarker = useCreateMarker(songId);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<MarkerType>("cue");
  const [timeDraft, setTimeDraft] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => {
          setTimeDraft(formatTime(position));
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-sm text-white/50 hover:border-orange-400/30 hover:text-orange-300"
      >
        <Plus className="size-4" /> {triggerLabel}
      </button>
    );
  }

  const save = () => {
    const parsed = parseTime(timeDraft);
    if (parsed === null) {
      toast.error("Formato de tiempo inválido — usá m:ss");
      return;
    }
    createMarker.mutate(
      {
        label: label || type,
        marker_type: type,
        color: MARKER_TYPE_COLORS[type],
        position_seconds: parsed,
      },
      {
        onSuccess: (marker) => onCreated?.(marker),
        onError: () => toast.error("No se pudo crear la sección"),
      },
    );
    setLabel("");
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={timeDraft}
        onChange={(e) => setTimeDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        title="Minuto de la canción donde va la sección (m:ss)"
        className="h-9 w-16 rounded-md border border-white/6 bg-black/30 px-2 text-center font-mono text-sm text-white outline-none focus:border-orange-400/40"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as MarkerType)}
        className="h-9 rounded-md border border-white/6 bg-black/30 px-1.5 text-sm text-white outline-none"
      >
        {MARKER_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option} className="bg-black">
            {option}
          </option>
        ))}
      </select>
      <input
        autoFocus
        className="h-9 w-36 rounded-md border border-white/6 bg-black/30 px-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
        placeholder="Nombre..."
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") save();
        }}
      />
      <button
        onClick={save}
        className="rounded-md border border-orange-400/40 bg-orange-400/15 px-3 py-2 text-sm font-semibold text-orange-300"
      >
        Guardar
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/40"
      >
        Cancelar
      </button>
    </div>
  );
}
