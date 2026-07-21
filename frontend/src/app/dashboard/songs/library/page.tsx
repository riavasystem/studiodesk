"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FileArchive, Music2, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteSong, useSongs } from "@/hooks/use-songs";
import { ImportZipDialog } from "@/components/songs/import-zip-dialog";
import { UploadSongDialog } from "@/components/songs/upload-song-dialog";
import { resolveCoverImageUrl } from "@/lib/api-client";
import { DefaultSongCover } from "@/components/ui/default-song-cover";

const COVER_GRADIENTS = [
  "from-orange-500/30 via-orange-500/10 to-transparent",
  "from-fuchsia-500/25 via-fuchsia-500/8 to-transparent",
  "from-sky-500/25 via-sky-500/8 to-transparent",
  "from-emerald-500/25 via-emerald-500/8 to-transparent",
  "from-violet-500/25 via-violet-500/8 to-transparent",
];

function coverGradient(id: number): string {
  return COVER_GRADIENTS[id % COVER_GRADIENTS.length];
}

export default function SongLibraryPage() {
  const { data: songs, isLoading } = useSongs();
  const deleteSong = useDeleteSong();

  const [importOpen, setImportOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/songs"
            className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80"
          >
            <ArrowLeft className="size-4" /> Reproductor
          </Link>
          <p className="mt-4 font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Biblioteca</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Canciones</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/youtube-import">
            <Button variant="outline">
              <Video className="size-4" />
              Importar de YouTube
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileArchive className="size-4" />
            Importar ZIP
          </Button>
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Music2 className="size-4" />
            Subir canción
          </Button>
          <ImportZipDialog open={importOpen} onOpenChange={setImportOpen} />
          <UploadSongDialog open={uploadOpen} onOpenChange={setUploadOpen} />
        </div>
      </div>

      {isLoading && <p className="text-sm text-white/50">Cargando...</p>}
      {songs?.length === 0 && <p className="text-sm text-white/50">No hay canciones todavía.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {songs?.map((song) => (
          <div
            key={song.id}
            className="group relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_20px_50px_-25px_rgba(0,0,0,0.9)] transition-transform hover:-translate-y-0.5"
          >
            <Link href={`/dashboard/songs/${song.id}`} className="block">
              <div
                className={`relative flex h-28 items-center justify-center overflow-hidden bg-linear-to-br ${coverGradient(song.id)} border-b border-white/6`}
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
                {song.musical_key && (
                  <span className="absolute top-2.5 right-2.5 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/70 backdrop-blur">
                    {song.musical_key}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-semibold text-white group-hover:text-orange-400">
                  {song.title}
                </p>
                <p className="truncate text-xs text-white/45">{song.artist}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  {song.bpm && (
                    <span className="rounded-full border border-white/8 bg-white/6 px-2 py-0.5 font-mono text-[10px] text-white/50">
                      {song.bpm} BPM
                    </span>
                  )}
                  {song.duration_seconds && (
                    <span className="rounded-full border border-white/8 bg-white/6 px-2 py-0.5 font-mono text-[10px] text-white/50">
                      {Math.floor(song.duration_seconds / 60)}:
                      {String(Math.floor(song.duration_seconds % 60)).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2.5 left-2.5 bg-black/40 text-white/50 opacity-0 backdrop-blur transition-opacity hover:text-red-400 group-hover:opacity-100"
              onClick={() =>
                deleteSong.mutate(song.id, {
                  onError: () => toast.error("No se pudo eliminar"),
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
