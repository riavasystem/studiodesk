"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Plus, X } from "lucide-react";
import { resolveCoverImageUrl } from "@/lib/api-client";
import { DefaultSongCover } from "@/components/ui/default-song-cover";
import { useQueueStore } from "@/store/queue-store";
import { AddToQueueDialog } from "@/components/player/add-to-queue-dialog";
import type { ISong } from "@/hooks/use-songs";

interface ISongCarouselProps {
  activeSongId: number;
  allSongs: ISong[];
}

export function SongCarousel({ activeSongId, allSongs }: ISongCarouselProps) {
  const queue = useQueueStore((s) => s.queue);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);
  const [addOpen, setAddOpen] = useState(false);

  const songs = queue
    .map((id) => allSongs.find((s) => s.id === id))
    .filter((s): s is ISong => s !== undefined);

  if (songs.length === 0) return null;

  return (
    <div className="flex items-stretch gap-4 overflow-x-auto pb-1">
      {songs.map((s) => {
        const active = s.id === activeSongId;
        const duration = s.duration_seconds
          ? `${Math.floor(s.duration_seconds / 60)}:${Math.floor(s.duration_seconds % 60).toString().padStart(2, "0")}`
          : null;
        return (
          <Link
            key={s.id}
            href={`/dashboard/songs/${s.id}`}
            className={`group relative flex h-32 w-52 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-linear-to-br from-white/10 to-transparent transition-all ${
              active
                ? "border-orange-400/60 shadow-[0_0_0_1px_rgba(255,138,31,0.35),0_8px_24px_-8px_rgba(255,138,31,0.4)]"
                : "border-white/8 group-hover:border-white/20"
            }`}
          >
            {s.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveCoverImageUrl(s.cover_image_url) ?? undefined}
                alt={s.title}
                className="absolute inset-0 size-full object-contain"
              />
            ) : (
              <DefaultSongCover seed={s.id} />
            )}
            {active && (
              <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-orange-400 px-2 py-1 text-[10px] font-bold text-black uppercase">
                <Play className="size-3 fill-current" /> En reproducción
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeFromQueue(s.id);
              }}
              title="Quitar de la lista de reproducción"
              className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:bg-black/80 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
            {/* Name + duration live inside the card (bottom overlay) instead
                of below it, so the carousel takes less vertical space and
                the timeline can sit higher on the page. */}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent px-2.5 pt-5 pb-2">
              <p className={`truncate text-sm font-medium ${active ? "text-orange-400" : "text-white"}`}>
                {s.title}
              </p>
              <p className="truncate text-xs text-white/60">
                {s.musical_key ? `${s.musical_key} · ` : ""}
                {s.bpm ? `${s.bpm} BPM` : ""}
                {duration ? ` · ${duration}` : ""}
              </p>
            </div>
          </Link>
        );
      })}
      <button
        onClick={() => setAddOpen(true)}
        className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/12 text-white/25 hover:border-white/25 hover:text-white/50"
      >
        <Plus className="size-8" />
      </button>
      <AddToQueueDialog open={addOpen} onOpenChange={setAddOpen} allSongs={allSongs} queue={queue} />
    </div>
  );
}
