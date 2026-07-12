"use client";

import { useState } from "react";
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
import { useAlbums, useCreateAlbum, useDeleteAlbum } from "@/hooks/use-albums";

export default function AlbumsPage() {
  const { data: albums, isLoading } = useAlbums();
  const createAlbum = useCreateAlbum();
  const deleteAlbum = useDeleteAlbum();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAlbum.mutate(
      { title, artist },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle("");
          setArtist("");
        },
        onError: () => toast.error("No se pudo crear el álbum"),
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Álbumes</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Álbumes</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>Nuevo álbum</Button>} />
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nuevo álbum</DialogTitle>
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
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={createAlbum.isPending}>
                  {createAlbum.isPending ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Todos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-white/50">Cargando...</p>}
          {albums?.length === 0 && <p className="text-sm text-white/50">No hay álbumes todavía.</p>}
          <ul className="divide-y divide-white/10">
            {albums?.map((album) => (
              <li key={album.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">{album.title}</p>
                  <p className="text-xs text-white/50">{album.artist}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    deleteAlbum.mutate(album.id, {
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
