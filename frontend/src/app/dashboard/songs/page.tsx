"use client";

import Link from "next/link";
import { Library } from "lucide-react";
import { SongCarousel } from "@/components/player/song-carousel";
import { useSongs } from "@/hooks/use-songs";
import { useQueueStore } from "@/store/queue-store";

/** Landing view for the "Reproductor" tab when no song is open yet — just
 * the queue (empty at first, only the "+" card) so the user can build a
 * set list from scratch and click a card to start playing it. Uploading/
 * managing the song library lives one click away, at /dashboard/songs/library. */
export default function PlayerLandingPage() {
  const { data: songs } = useSongs();
  const queue = useQueueStore((s) => s.queue);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Reproductor</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {queue.length === 0 ? "Armá tu lista para empezar" : "Tu lista de reproducción"}
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Agregá canciones con el botón + y hacé click en una para empezar a reproducirla.
          </p>
        </div>
        <Link
          href="/dashboard/songs/library"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-sm text-white/60 hover:border-white/25 hover:text-white"
        >
          <Library className="size-4" /> Biblioteca de canciones
        </Link>
      </div>

      <SongCarousel activeSongId={-1} allSongs={songs ?? []} />
    </div>
  );
}
