"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const NONE_VALUE = "none";

export default function SongsPage() {
  const { data: songs, isLoading } = useSongs();
  const { data: categories } = useCategories();
  const { data: albums } = useAlbums();
  const createSong = useCreateSong();
  const deleteSong = useDeleteSong();

  const [open, setOpen] = useState(false);
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
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Canciones</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Canciones</h1>
        </div>
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

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Todas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-white/50">Cargando...</p>}
          {songs?.length === 0 && <p className="text-sm text-white/50">No hay canciones todavía.</p>}
          <ul className="divide-y divide-white/10">
            {songs?.map((song) => (
              <li key={song.id} className="flex items-center justify-between py-3">
                <Link href={`/dashboard/songs/${song.id}`} className="flex-1">
                  <p className="text-sm font-medium text-white hover:text-orange-400">{song.title}</p>
                  <p className="text-xs text-white/50">
                    {song.artist}
                    {song.bpm ? ` · ${song.bpm} BPM` : ""}
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    deleteSong.mutate(song.id, {
                      onError: () => toast.error("No se pudo eliminar"),
                    })
                  }
                >
                  <Trash2 className="size-4 text-white/40" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
