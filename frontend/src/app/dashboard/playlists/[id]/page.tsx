"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddSongToPlaylist, usePlaylistSongs, useRemoveSongFromPlaylist } from "@/hooks/use-playlists";
import { useSongs } from "@/hooks/use-songs";
import { useQueueStore } from "@/store/queue-store";

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const playlistId = Number(id);
  const router = useRouter();
  const setQueue = useQueueStore((s) => s.setQueue);

  const { data: items, isLoading } = usePlaylistSongs(playlistId);
  const { data: songs } = useSongs();
  const addSong = useAddSongToPlaylist(playlistId);
  const removeSong = useRemoveSongFromPlaylist(playlistId);
  const [selectedSongId, setSelectedSongId] = useState("");

  const songsById = new Map(songs?.map((song) => [song.id, song]));
  const availableSongs = songs?.filter((song) => !items?.some((item) => item.song_id === song.id));

  const orderedSongIds = [...(items ?? [])].sort((a, b) => a.order_index - b.order_index).map((i) => i.song_id);

  const openInPlayer = () => {
    if (orderedSongIds.length === 0) return;
    setQueue(orderedSongIds);
    router.push(`/dashboard/songs/${orderedSongIds[0]}?autoplay=1`);
  };

  const handleAdd = () => {
    if (!selectedSongId) return;
    addSong.mutate(
      { songId: Number(selectedSongId), orderIndex: items?.length ?? 0 },
      {
        onSuccess: () => setSelectedSongId(""),
        onError: () => toast.error("No se pudo agregar la canción"),
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/playlists"
            className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80"
          >
            <ArrowLeft className="size-4" /> Playlists
          </Link>
          <p className="mt-4 font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Playlist</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Repertorio</h1>
        </div>
        <Button onClick={openInPlayer} disabled={orderedSongIds.length === 0} className="mt-1 shrink-0">
          <Play className="size-4" /> Abrir en el reproductor
        </Button>
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Agregar canción</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Select value={selectedSongId} onValueChange={(value) => setSelectedSongId(value ?? "")}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecciona una canción" />
            </SelectTrigger>
            <SelectContent>
              {availableSongs?.map((song) => (
                <SelectItem key={song.id} value={String(song.id)}>
                  {song.title} — {song.artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!selectedSongId || addSong.isPending}>
            Agregar
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Canciones en esta playlist</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-white/50">Cargando...</p>}
          {items?.length === 0 && (
            <p className="text-sm text-white/50">Todavía no hay canciones en esta playlist.</p>
          )}
          <ul className="divide-y divide-white/10">
            {items?.map((item) => {
              const song = songsById.get(item.song_id);
              return (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{song?.title ?? `Canción #${item.song_id}`}</p>
                    <p className="text-xs text-white/50">{song?.artist}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      removeSong.mutate(item.id, {
                        onError: () => toast.error("No se pudo quitar la canción"),
                      })
                    }
                  >
                    <Trash2 className="size-4 text-white/40" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
