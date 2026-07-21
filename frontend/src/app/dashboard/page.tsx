"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ListMusic, Disc3, Tag, Music2, Star, Plus, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DefaultSongCover } from "@/components/ui/default-song-cover";
import { useAuthStore } from "@/lib/auth-store";
import { useSongs } from "@/hooks/use-songs";
import { usePlaylists, usePlaylistSongs, type IPlaylist } from "@/hooks/use-playlists";
import { useAlbums } from "@/hooks/use-albums";
import { useCategories } from "@/hooks/use-categories";
import { resolveCoverImageUrl } from "@/lib/api-client";
import { useQueueStore } from "@/store/queue-store";
import { getSharedMultitrackEngine } from "@/lib/multitrack-engine";
import { openProjectInPlayer } from "@/lib/prefetch-song";

const COVER_GRADIENTS = [
  "from-orange-500/25 to-transparent",
  "from-sky-500/25 to-transparent",
  "from-emerald-500/25 to-transparent",
  "from-violet-500/25 to-transparent",
  "from-pink-500/25 to-transparent",
  "from-amber-500/25 to-transparent",
];

function coverGradient(id: number): string {
  return COVER_GRADIENTS[id % COVER_GRADIENTS.length];
}

function StatCard({
  href,
  label,
  count,
  icon: Icon,
}: {
  href: string;
  label: string;
  count: number | undefined;
  icon: typeof ListMusic;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-transparent p-4 transition-all hover:-translate-y-0.5 hover:border-orange-400/30"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-400/10 text-orange-400">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-2xl font-bold text-white tabular-nums">{count ?? "–"}</p>
        <p className="truncate text-xs text-white/45">{label}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-white/15 transition-colors group-hover:text-orange-400" />
    </Link>
  );
}

/** A saved project/playlist opens straight into the player — no detour
 * through the playlist's repertoire-editing page first. */
function SavedProjectCard({ playlist }: { playlist: IPlaylist }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setQueue = useQueueStore((s) => s.setQueue);
  const { data: items } = usePlaylistSongs(playlist.id);
  const orderedSongIds = [...(items ?? [])].sort((a, b) => a.order_index - b.order_index).map((i) => i.song_id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const open = () => openProjectInPlayer(router, queryClient, setQueue, orderedSongIds);

  return (
    <>
      <button
        onClick={() => {
          if (orderedSongIds.length === 0) return;
          if (getSharedMultitrackEngine().isPlaying) setConfirmOpen(true);
          else open();
        }}
        disabled={orderedSongIds.length === 0}
        className="flex w-44 shrink-0 flex-col gap-1 rounded-xl border border-white/8 bg-linear-to-b from-white/5 to-transparent p-3 text-left transition-colors hover:border-orange-400/30 disabled:opacity-40"
      >
        <ListMusic className="size-4 text-white/30" />
        <p className="mt-1 truncate text-sm font-medium text-white">{playlist.name}</p>
        <p className="text-xs text-orange-400">Cargar y reproducir →</p>
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Cambiar de reproducción?"
        description={`Hay algo sonando ahora mismo. Abrir "${playlist.name}" va a dejar de reproducir la canción actual y empezar esta lista nueva.`}
        confirmLabel="Sí, ir a la reproducción"
        onConfirm={open}
      />
    </>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: songs, isLoading, isError } = useSongs();
  const { data: playlists } = usePlaylists();
  const { data: albums } = useAlbums();
  const { data: categories } = useCategories();

  const favorites = songs?.filter((s) => s.is_favorite) ?? [];
  const recentSongs = songs ? [...songs].sort((a, b) => b.id - a.id).slice(0, 8) : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Panel</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Hola, {user?.full_name?.split(" ")[0] ?? "de nuevo"}
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {songs && songs.length > 0
              ? `Tenés ${songs.length} canción${songs.length === 1 ? "" : "es"} lista${songs.length === 1 ? "" : "s"} para ensayar o tocar en vivo.`
              : "Empezá subiendo tu primera canción para armar tu repertorio."}
          </p>
        </div>
        <Link
          href="/dashboard/songs/library"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-medium text-black hover:bg-orange-400"
        >
          <Plus className="size-4" /> Nueva canción
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard href="/dashboard/songs/library" label="Canciones" count={songs?.length} icon={Music2} />
        <StatCard href="/dashboard/playlists" label="Playlists" count={playlists?.length} icon={ListMusic} />
        <StatCard href="/dashboard/albums" label="Álbumes" count={albums?.length} icon={Disc3} />
        <StatCard href="/dashboard/categories" label="Categorías" count={categories?.length} icon={Tag} />
      </div>

      {playlists && playlists.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListMusic className="size-4 text-orange-400" />
              <h2 className="text-sm font-semibold tracking-wide text-white/70 uppercase">
                Abrir un proyecto guardado
              </h2>
            </div>
            <Link href="/dashboard/playlists" className="text-xs text-orange-400 hover:text-orange-300">
              Ver todas
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {playlists.slice(0, 6).map((playlist) => (
              <SavedProjectCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </div>
      )}

      {favorites.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white/70 uppercase">Favoritas</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {favorites.map((song) => (
              <Link
                key={song.id}
                href={`/dashboard/songs/${song.id}`}
                className="group flex w-32 shrink-0 flex-col gap-1.5"
              >
                <div
                  className={`relative flex h-20 items-center justify-center overflow-hidden rounded-xl border border-white/8 bg-linear-to-br ${coverGradient(song.id)} transition-colors group-hover:border-orange-400/40`}
                >
                  {song.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveCoverImageUrl(song.cover_image_url) ?? undefined}
                      alt={song.title}
                      className="absolute inset-0 size-full object-contain"
                    />
                  ) : (
                    <DefaultSongCover seed={song.id} />
                  )}
                </div>
                <p className="truncate text-xs font-medium text-white/80 group-hover:text-orange-400">
                  {song.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card className="border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Canciones recientes</CardTitle>
          {songs && songs.length > 8 && (
            <Link href="/dashboard/songs/library" className="text-xs text-orange-400 hover:text-orange-300">
              Ver todas
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-white/50">Cargando canciones...</p>}
          {isError && <p className="text-sm text-red-400">No se pudieron cargar las canciones.</p>}
          {songs && songs.length === 0 && (
            <p className="text-sm text-white/50">
              Todavía no tienes canciones. Empieza subiendo tu primera pista.
            </p>
          )}
          {recentSongs.length > 0 && (
            <ul className="divide-y divide-white/10">
              {recentSongs.map((song) => (
                <li key={song.id}>
                  <Link
                    href={`/dashboard/songs/${song.id}`}
                    className="group flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors hover:bg-white/5"
                  >
                    <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-white/4">
                      {song.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveCoverImageUrl(song.cover_image_url) ?? undefined}
                          alt={song.title}
                          className="size-full object-contain"
                        />
                      ) : (
                        <DefaultSongCover seed={song.id} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white group-hover:text-orange-400">
                        {song.title}
                      </p>
                      <p className="truncate text-xs text-white/50">{song.artist}</p>
                    </div>
                    {song.musical_key && (
                      <span className="hidden shrink-0 rounded-full border border-white/8 bg-white/6 px-2 py-0.5 font-mono text-[10px] text-white/50 sm:inline-block">
                        {song.musical_key}
                      </span>
                    )}
                    {song.bpm && (
                      <span className="shrink-0 font-mono text-xs text-white/40">{song.bpm} BPM</span>
                    )}
                    <ChevronRight className="size-4 shrink-0 text-white/15 transition-colors group-hover:text-orange-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
