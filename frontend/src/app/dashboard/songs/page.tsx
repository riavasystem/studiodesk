"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileArchive, Music2, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSong, useDeleteSong, useSongs } from "@/hooks/use-songs";
import { useCategories } from "@/hooks/use-categories";
import { useAlbums } from "@/hooks/use-albums";
import { ImportZipDialog } from "@/components/songs/import-zip-dialog";
import { UploadSongDialog } from "@/components/songs/upload-song-dialog";
import { resolveCoverImageUrl } from "@/lib/api-client";

const NONE_VALUE = "none";

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

export default function SongsPage() {
  const { data: songs, isLoading } = useSongs();
  const { data: categories } = useCategories();
  const { data: albums } = useAlbums();
  const createSong = useCreateSong();
  const deleteSong = useDeleteSong();

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [bpm, setBpm] = useState("");
  const [categoryId, setCategoryId] = useState(NONE_VALUE);
  const [albumId, setAlbumId] = useState(NONE_VALUE);

  const resetForm = () => {
    setTitle("");
    setArtist("");
    setBpm("");
    setCategoryId(NONE_VALUE);
    setAlbumId(NONE_VALUE);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSong.mutate(
      {
        title,
        artist,
        bpm: bpm ? Number(bpm) : null,
        category_id: categoryId === NONE_VALUE ? null : Number(categoryId),
        album_id: albumId === NONE_VALUE ? null : Number(albumId),
      },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
        },
        onError: () => toast.error("No se pudo crear la canción"),
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Canciones</p>
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button>Nueva canción</Button>} />
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nueva canción</DialogTitle>
              </DialogHeader>
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="artist">Artista</Label>
                  <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="bpm">BPM</Label>
                  <Input id="bpm" type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Categoría</Label>
                  <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? NONE_VALUE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin categoría</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Álbum</Label>
                  <Select value={albumId} onValueChange={(value) => setAlbumId(value ?? NONE_VALUE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin álbum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin álbum</SelectItem>
                      {albums?.map((album) => (
                        <SelectItem key={album.id} value={String(album.id)}>
                          {album.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={createSong.isPending}>
                  {createSong.isPending ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
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
                  <Music2 className="size-8 text-white/30" strokeWidth={1.5} />
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
