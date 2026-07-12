"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSong } from "@/hooks/use-songs";
import {
  useCreateTrack,
  useDeleteTrack,
  useTracks,
  useUpdateTrack,
  useUploadAudio,
} from "@/hooks/use-tracks";

export default function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const songId = Number(id);

  const { data: song } = useSong(songId);
  const { data: tracks, isLoading } = useTracks(songId);
  const uploadAudio = useUploadAudio();
  const createTrack = useCreateTrack(songId);
  const updateTrack = useUpdateTrack(songId);
  const deleteTrack = useDeleteTrack(songId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const audioFile = await uploadAudio.mutateAsync(file);
      const name = file.name.replace(/\.[^/.]+$/, "");
      await createTrack.mutateAsync({
        name,
        file_path: audioFile.storage_path,
        order_index: tracks?.length ?? 0,
      });
      toast.success("Pista agregada");
    } catch {
      toast.error("No se pudo subir el archivo de audio");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/songs"
          className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" /> Canciones
        </Link>
        <p className="mt-4 font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Canción</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {song?.title ?? "..."}
        </h1>
        <p className="text-sm text-white/50">
          {song?.artist}
          {song?.bpm ? ` · ${song.bpm} BPM` : ""}
        </p>
      </div>

      <Card className="border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pistas</CardTitle>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/wav,audio/mpeg,audio/flac,audio/aiff,audio/ogg,audio/mp4,.wav,.mp3,.flac,.aiff,.aif,.ogg,.m4a"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload className="size-4" />
              {isUploading ? "Subiendo..." : "Agregar pista"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {isLoading && <p className="text-sm text-white/50">Cargando...</p>}
          {tracks?.length === 0 && (
            <p className="text-sm text-white/50">
              Todavía no tienes pistas. Sube el primer archivo de audio (voz, click, guitarra...).
            </p>
          )}
          {tracks?.map((track) => (
            <div key={track.id} className="rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{track.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    deleteTrack.mutate(track.id, {
                      onError: () => toast.error("No se pudo eliminar la pista"),
                    })
                  }
                >
                  <Trash2 className="size-4 text-white/40" />
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Label className="w-16 text-xs text-white/50">Volumen</Label>
                <Slider
                  className="flex-1"
                  min={0}
                  max={2}
                  step={0.01}
                  value={[track.volume]}
                  onValueChange={(value) => {
                    const volume = Array.isArray(value) ? value[0] : value;
                    updateTrack.mutate({
                      id: track.id,
                      name: track.name,
                      file_path: track.file_path,
                      order_index: track.order_index,
                      volume,
                      is_muted: track.is_muted,
                      is_solo: track.is_solo,
                    });
                  }}
                />
              </div>

              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={track.is_muted}
                    onCheckedChange={(checked) =>
                      updateTrack.mutate({
                        id: track.id,
                        name: track.name,
                        file_path: track.file_path,
                        order_index: track.order_index,
                        volume: track.volume,
                        is_muted: checked,
                        is_solo: track.is_solo,
                      })
                    }
                  />
                  <Label className="text-xs text-white/50">Mute</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={track.is_solo}
                    onCheckedChange={(checked) =>
                      updateTrack.mutate({
                        id: track.id,
                        name: track.name,
                        file_path: track.file_path,
                        order_index: track.order_index,
                        volume: track.volume,
                        is_muted: track.is_muted,
                        is_solo: checked,
                      })
                    }
                  />
                  <Label className="text-xs text-white/50">Solo</Label>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
