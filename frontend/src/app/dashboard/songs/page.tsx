"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListMusic, ListTree, Play, Repeat, Settings2, Sliders, SkipBack, Square, Waves } from "lucide-react";
import { SongCarousel } from "@/components/player/song-carousel";
import { useSongs } from "@/hooks/use-songs";
import { useQueueStore } from "@/store/queue-store";

/** Landing view for the "Reproductor" tab. If a song was already open this
 * session, jump straight back to its full player (mid-playback, nothing
 * interrupted) instead of showing this empty shell — see activeSongId in
 * queue-store. Only shown when there's genuinely nothing playing yet. */
export default function PlayerLandingPage() {
  const router = useRouter();
  const { data: songs } = useSongs();
  const activeSongId = useQueueStore((s) => s.activeSongId);

  useEffect(() => {
    if (activeSongId !== null) router.replace(`/dashboard/songs/${activeSongId}`);
  }, [activeSongId, router]);

  if (activeSongId !== null) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Empty transport bar — same shape as the real one, everything disabled. */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-transparent px-4 py-2.5 opacity-50">
        <div className="flex flex-col items-start gap-0.5 leading-none">
          <span className="font-mono text-2xl font-bold text-white/40 tabular-nums">--</span>
          <span className="mt-1 font-mono text-xs text-white/25">4/4</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-5 py-2.5 leading-tight">
          <span className="font-mono text-2xl font-bold text-white/30 tabular-nums">0:00</span>
          <span className="font-mono text-xs text-white/20">0:00 / 0:00</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
          <span className="font-mono text-lg font-bold text-white/30">--</span>
          <span className="font-mono text-[10px] tracking-widest text-white/25 uppercase">Tonalidad</span>
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-white/25">
          <Waves className="size-5" />
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-white/25">
          <SkipBack className="size-5" />
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-white/25">
          <Play className="size-5" />
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-white/25">
          <Repeat className="size-5" />
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-white/25">
          <Square className="size-5" />
        </div>
        <div className="min-w-0 flex-1" />
        <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-white/25">
          <ListMusic className="size-5" />
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl border border-white/8 bg-black/30 text-white/25">
          <ListTree className="size-5" />
        </div>
      </div>

      {/* Queue — the one part that's actually functional here: pick or add a
          song to start playing. */}
      <div className="rounded-2xl border border-white/6 bg-black/15 p-2">
        <p className="mb-2 px-1 font-mono text-[10px] tracking-widest text-white/30 uppercase">
          Cola de reproducción — elegí una canción para empezar
        </p>
        <SongCarousel activeSongId={-1} allSongs={songs ?? []} />
      </div>

      {/* Empty timeline */}
      <div className="flex min-h-32 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-white/6 bg-black/25 py-10 text-center opacity-60">
        <Settings2 className="size-6 text-white/20" />
        <p className="max-w-xs text-sm text-white/30">
          Acá vas a ver la estructura y el waveform de la canción que elijas.
        </p>
      </div>

      {/* Empty mixer */}
      <div className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-white/6 bg-black/20 py-6 text-center text-sm text-white/25">
        <Sliders className="size-4" />
        El mezclador y las pistas aparecen acá cuando cargues una canción.
      </div>
    </div>
  );
}
