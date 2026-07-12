"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreatePlaylist, useDeletePlaylist, usePlaylists } from "@/hooks/use-playlists";

export default function PlaylistsPage() {
  const { data: playlists, isLoading } = usePlaylists();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPlaylist.mutate(name, {
      onSuccess: () => {
        setOpen(false);
        setName("");
      },
      onError: () => toast.error("No se pudo crear la playlist"),
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Playlists</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Playlists</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>Nueva playlist</Button>} />
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nueva playlist</DialogTitle>
              </DialogHeader>
              <Input
                className="mt-4"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={createPlaylist.isPending}>
                  {createPlaylist.isPending ? "Creando..." : "Crear"}
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
          {playlists?.length === 0 && <p className="text-sm text-white/50">No hay playlists todavía.</p>}
          <ul className="divide-y divide-white/10">
            {playlists?.map((playlist) => (
              <li key={playlist.id} className="flex items-center justify-between py-3">
                <Link href={`/dashboard/playlists/${playlist.id}`} className="flex-1">
                  <p className="text-sm font-medium text-white hover:text-orange-400">{playlist.name}</p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    deletePlaylist.mutate(playlist.id, {
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
