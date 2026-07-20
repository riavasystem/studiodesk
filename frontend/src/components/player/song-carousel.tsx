"use client";

import { useState } from "react";
import Link from "next/link";
import { Music2, Play, Plus } from "lucide-react";
import { resolveCoverImageUrl } from "@/lib/api-client";
import { useQueueStore } from "@/store/queue-store";
import { AddToQueueDialog } from "@/components/player/add-to-queue-dialog";
import type { ISong } from "@/hooks/use-songs";

interface ISongCarouselProps {
  activeSongId: number;
  allSongs: ISong[];
}

export function SongCarousel({ activeSongId, allSongs }: ISongCarouselProps) {
  const queue = useQueueStore((s) => s.queue);
  const [addOpen, setAddOpen] = useState(false);

  const songs = queue
    .map((id) => allSongs.find((s) => s.id === id))
    .filter((s): s is ISong => s !== undefined);

  if (songs.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
      {songs.map((s) => {
        const active = s.id === activeSongId;
        return (
          <Link
            key={s.id}
            href={`/dashboard/songs/${s.id}`}
            className="group flex w-36 shrink-0 flex-col gap-1.5"
          >
            <div
              className={`relative flex h-20 items-center justify-center overflow-hidden rounded-xl border bg-linear-to-br from-white/10 to-transparent transition-all ${
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
                <Music2 className="size-6 text-white/20" strokeWidth={1.5} />
              )}
              {active && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-orange-400 px-1.5 py-0.5 text-[9px] font-bold text-black uppercase">
                  <Play className="size-2.5 fill-current" /> En reproducción
                </span>
              )}
            </div>
            <p
              className={`truncate text-[12px] font-medium ${active ? "text-orange-400" : "text-white/60 group-hover:text-white"}`}
            >
              {s.title}
            </p>
            <p className="truncate text-[10px] text-white/35">
              {s.musical_key ? `${s.musical_key} · ` : ""}
              {s.bpm ? `${s.bpm} BPM` : ""}
              {s.duration_seconds ? ` · ${Math.floor(s.duration_seconds / 60)}:${Math.floor(s.duration_seconds % 60).toString().padStart(2, "0")}` : ""}
            </p>
          </Link>
        );
      })}
      <button
        onClick={() => setAddOpen(true)}
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/12 text-white/25 hover:border-white/25 hover:text-white/50"
      >
        <Plus className="size-5" />
      </button>
      <AddToQueueDialog open={addOpen} onOpenChange={setAddOpen} allSongs={allSongs} queue={queue} />
    </div>
  );
}
