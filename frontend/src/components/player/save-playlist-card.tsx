"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ListMusic, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ISong } from "@/hooks/use-songs";
import type { IPlaylist } from "@/hooks/use-playlists";

interface ISavePlaylistCardProps {
  songs: ISong[];
  onDismiss: () => void;
  onSaved: () => void;
}

/** Shown once a queued run of songs finishes playing through with nothing
 * left to auto-advance to — offers to persist the current session queue
 * (each song's own sections/sequence are already saved server-side, so the
 * playlist only needs to remember which songs and in what order). */
export function SavePlaylistCard({ songs, onDismiss, onSaved }: ISavePlaylistCardProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const playlist = await apiFetch<IPlaylist>("/playlists", { method: "POST", body: { name: trimmed } });
      for (let i = 0; i < songs.length; i++) {
        await apiFetch(`/playlists/${playlist.id}/songs`, {
          method: "POST",
          body: { song_id: songs[i].id, order_index: i },
        });
      }
      toast.success("Playlist guardada");
      onSaved();
    } catch {
      toast.error("No se pudo guardar la playlist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-[min(92vw,26rem)] flex-col gap-3 rounded-2xl border border-orange-400/30 bg-neutral-950/95 p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListMusic className="size-4 text-orange-400" />
          <p className="text-sm font-semibold text-white">¿Guardar esta playlist?</p>
        </div>
        <button onClick={onDismiss} className="text-white/40 hover:text-white/80">
          <X className="size-4" />
        </button>
      </div>
      <p className="text-xs text-white/50">
        Terminaste de reproducir {songs.length} canciones en secuencia. Guardá el orden para abrirlo de nuevo sin
        tener que armarlo otra vez.
      </p>
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Nombre de la playlist"
          className="h-9 flex-1 rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-400/40"
        />
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          className="rounded-md border border-orange-400/40 bg-orange-400/15 px-3 py-2 text-sm font-semibold text-orange-300 disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
