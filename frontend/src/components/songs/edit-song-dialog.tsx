"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveCoverImageUrl } from "@/lib/api-client";
import { useUpdateSong, type ISong } from "@/hooks/use-songs";
import { useCategories } from "@/hooks/use-categories";
import { useAlbums } from "@/hooks/use-albums";

const NONE_VALUE = "none";
const COLOR_PALETTE = ["#ff8a1f", "#ef4444", "#22c55e", "#0ea5e9", "#a855f7", "#ec4899", "#eab308", "#6b7280"];

interface IEditSongDialogProps {
  song: ISong;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSongDialog({ song, open, onOpenChange }: IEditSongDialogProps) {
  const updateSong = useUpdateSong(song.id);
  const { data: categories } = useCategories();
  const { data: albums } = useAlbums();

  const [form, setForm] = useState(song);

  useEffect(() => {
    if (open) setForm(song);
  }, [open, song]);

  const patch = <K extends keyof ISong>(key: K, value: ISong[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSong.mutate(
      {
        title: form.title,
        artist: form.artist,
        bpm: form.bpm,
        musical_key: form.musical_key,
        time_signature: form.time_signature,
        language: form.language,
        notes: form.notes,
        tags: form.tags,
        song_date: form.song_date,
        cover_image_url: form.cover_image_url,
        color: form.color,
        is_favorite: form.is_favorite,
        category_id: form.category_id,
        album_id: form.album_id,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: () => toast.error("No se pudo guardar la canción"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar canción</DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input id="edit-title" value={form.title} onChange={(e) => patch("title", e.target.value)} required />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="edit-artist">Artista</Label>
              <Input id="edit-artist" value={form.artist} onChange={(e) => patch("artist", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Álbum</Label>
              <Select
                value={form.album_id ? String(form.album_id) : NONE_VALUE}
                onValueChange={(value) => patch("album_id", value === NONE_VALUE ? null : Number(value))}
              >
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
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <Select
                value={form.category_id ? String(form.category_id) : NONE_VALUE}
                onValueChange={(value) => patch("category_id", value === NONE_VALUE ? null : Number(value))}
              >
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
              <Label htmlFor="edit-key">Tonalidad</Label>
              <Input
                id="edit-key"
                value={form.musical_key ?? ""}
                onChange={(e) => patch("musical_key", e.target.value || null)}
                placeholder="Ej. C, Am"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-bpm">BPM</Label>
              <Input
                id="edit-bpm"
                type="number"
                value={form.bpm ?? ""}
                onChange={(e) => patch("bpm", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-time-sig">Compás</Label>
              <Input
                id="edit-time-sig"
                value={form.time_signature}
                onChange={(e) => patch("time_signature", e.target.value)}
                placeholder="4/4"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-language">Idioma</Label>
              <Input
                id="edit-language"
                value={form.language ?? ""}
                onChange={(e) => patch("language", e.target.value || null)}
                placeholder="Español"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                type="date"
                value={form.song_date ?? ""}
                onChange={(e) => patch("song_date", e.target.value || null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex h-8 items-center gap-1.5">
                {COLOR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => patch("color", hex)}
                    className={`size-5 rounded-full border transition-transform ${
                      form.color === hex ? "scale-110 border-white" : "border-white/20"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="edit-cover">URL de portada</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/4">
                  {form.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveCoverImageUrl(form.cover_image_url) ?? undefined}
                      alt="Portada"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-[9px] text-white/25">Sin portada</span>
                  )}
                </div>
                <Input
                  id="edit-cover"
                  className="flex-1"
                  value={form.cover_image_url ?? ""}
                  onChange={(e) => patch("cover_image_url", e.target.value || null)}
                  placeholder="https://... (o se completa sola al importar un ZIP)"
                />
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="edit-tags">Tags (separados por coma)</Label>
              <Input
                id="edit-tags"
                value={form.tags ?? ""}
                onChange={(e) => patch("tags", e.target.value || null)}
                placeholder="alabanza, rápida, navidad"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                value={form.notes ?? ""}
                onChange={(e) => patch("notes", e.target.value || null)}
              />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-white/8 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-white/70">
                <Star className="size-4" /> Favorita
              </span>
              <Switch checked={form.is_favorite} onCheckedChange={(checked) => patch("is_favorite", checked)} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={updateSong.isPending}>
              <Pencil className="size-4" />
              {updateSong.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
