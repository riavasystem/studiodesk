"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Plus, X } from "lucide-react";
import { resolveCoverImageUrl } from "@/lib/api-client";
import { DefaultSongCover } from "@/components/ui/default-song-cover";
import { useQueueStore } from "@/store/queue-store";
import { AddToQueueDialog } from "@/components/player/add-to-queue-dialog";
import type { ISong } from "@/hooks/use-songs";

interface IQueuePanelProps {
  activeSongId: number;
  allSongs: ISong[];
}

export function QueuePanel({ activeSongId, allSongs }: IQueuePanelProps) {
  const queue = useQueueStore((s) => s.queue);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);
  const [addOpen, setAddOpen] = useState(false);

  const songs = queue.map((id) => allSongs.find((s) => s.id === id)).filter((s): s is ISong => s !== undefined);

  return (
    <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">
          Cola de reproducción — {songs.length} {songs.length === 1 ? "canción" : "canciones"}
        </p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/60 hover:border-white/25 hover:text-white"
        >
          <Plus className="size-3.5" />
          Agregar canción
        </button>
      </div>

      {songs.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/30">No hay canciones en la cola.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {songs.map((s, i) => {
            const active = s.id === activeSongId;
            return (
              <div
                key={s.id}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                  active ? "border-orange-400/50 bg-orange-400/10" : "border-white/6 hover:border-white/15"
                }`}
              >
                <span className="w-5 shrink-0 text-center font-mono text-xs text-white/30">{i + 1}</span>
                <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/8">
                  {s.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveCoverImageUrl(s.cover_image_url) ?? undefined}
                      alt={s.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <DefaultSongCover seed={s.id} />
                  )}
                </div>
                <Link href={`/dashboard/songs/${s.id}`} className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${active ? "text-orange-300" : "text-white"}`}>
                    {s.title}
                  </p>
                  <p className="truncate text-xs text-white/40">{s.artist}</p>
                </Link>
                {active && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-400 px-2 py-1 text-[10px] font-bold text-black uppercase">
                    <Play className="size-3 fill-current" /> Sonando
                  </span>
                )}
                <button
                  onClick={() => removeFromQueue(s.id)}
                  title="Quitar de la cola"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/30 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AddToQueueDialog open={addOpen} onOpenChange={setAddOpen} allSongs={allSongs} queue={queue} />
    </div>
  );
}
