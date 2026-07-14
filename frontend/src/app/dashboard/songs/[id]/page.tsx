"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultitrackPlayerLoader } from "@/components/player/multitrack-player-loader";
import { EditSongDialog } from "@/components/songs/edit-song-dialog";
import { useSong, useSongs } from "@/hooks/use-songs";
import {
  useCreateTrack,
  useDeleteTrack,
  useTracks,
  useUpdateTrack,
  useUploadAudio,
  type ITrack,
} from "@/hooks/use-tracks";

interface IEditableTrackNameProps {
  track: ITrack;
  editing: boolean;
  onStopEditing: () => void;
  onRename: (name: string) => void;
}

function EditableTrackName({ track, editing, onStopEditing, onRename }: IEditableTrackNameProps) {
  const [name, setName] = useState(track.name);

  const commit = () => {
    onStopEditing();
    const trimmed = name.trim();
    if (trimmed && trimmed !== track.name) onRename(trimmed);
    else setName(track.name);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setName(track.name);
            onStopEditing();
          }
        }}
        className="min-w-0 flex-1 rounded border border-orange-400/40 bg-black/40 px-2 py-1 text-sm text-white outline-none"
      />
    );
  }

  return <span className="min-w-0 flex-1 truncate text-sm text-white">{track.name}</span>;
}

export default function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const songId = Number(id);

  const { data: song } = useSong(songId);
  const { data: songs } = useSongs();
  const { data: tracks, isLoading } = useTracks(songId);
  const uploadAudio = useUploadAudio();
  const createTrack = useCreateTrack(songId);
  const updateTrack = useUpdateTrack(songId);
  const deleteTrack = useDeleteTrack(songId);

  const renameTrack = (track: ITrack, name: string) => {
    updateTrack.mutate(
      {
        id: track.id,
        name,
        file_path: track.file_path,
        order_index: track.order_index,
        volume: track.volume,
        pan: track.pan,
        is_muted: track.is_muted,
        is_solo: track.is_solo,
        is_phase_inverted: track.is_phase_inverted,
        color: track.color,
        track_type: track.track_type,
        is_hidden: track.is_hidden,
        duration_seconds: track.duration_seconds,
      },
      { onError: () => toast.error("No se pudo renombrar la pista") },
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);

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
        file_path: String(audioFile.id),
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/songs"
          className="inline-flex w-fit items-center gap-1 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" /> Canciones
        </Link>
        {song && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </div>

      {song && <EditSongDialog song={song} open={editOpen} onOpenChange={setEditOpen} />}

      {song && tracks && tracks.length > 0 && (
        <MultitrackPlayerLoader
          song={song}
          songs={songs ?? []}
          tracks={tracks}
          onUpdateTrack={(input) => updateTrack.mutate(input)}
        />
      )}

      {tracks && tracks.length === 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/2 px-6 py-10 text-center">
          <p className="text-sm text-white/50">
            Sube la primera pista de <span className="text-white">{song?.title}</span> para activar el
            reproductor.
          </p>
        </div>
      )}

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
        <CardContent className="flex flex-col gap-2">
          {isLoading && <p className="text-sm text-white/50">Cargando...</p>}
          <ul className="divide-y divide-white/10">
            {tracks?.map((track) => (
              <li key={track.id} className="flex items-center gap-3 py-2">
                <EditableTrackName
                  track={track}
                  editing={editingTrackId === track.id}
                  onStopEditing={() => setEditingTrackId(null)}
                  onRename={(name) => renameTrack(track, name)}
                />
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Renombrar"
                    onClick={() => setEditingTrackId(track.id)}
                  >
                    <Pencil className="size-4 text-white/40" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Eliminar"
                    onClick={() =>
                      deleteTrack.mutate(track.id, {
                        onError: () => toast.error("No se pudo eliminar la pista"),
                      })
                    }
                  >
                    <Trash2 className="size-4 text-white/40" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
