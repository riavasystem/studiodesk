"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { MultitrackPlayerLoader } from "@/components/player/multitrack-player-loader";
import { EditSongDialog } from "@/components/songs/edit-song-dialog";
import { useSong, useSongs } from "@/hooks/use-songs";
import { useCreateTrack, useDeleteTrack, useTracks, useUpdateTrack, useUploadAudio } from "@/hooks/use-tracks";

export default function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const songId = Number(id);

  const { data: song } = useSong(songId);
  const { data: songs } = useSongs();
  const { data: tracks } = useTracks(songId);
  const uploadAudio = useUploadAudio();
  const createTrack = useCreateTrack(songId);
  const updateTrack = useUpdateTrack(songId);
  const deleteTrack = useDeleteTrack(songId);

  const [isUploading, setIsUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleUploadTrack = async (file: File) => {
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
    <div className="flex flex-col gap-2">
      {song && <EditSongDialog song={song} open={editOpen} onOpenChange={setEditOpen} />}

      {song && tracks && tracks.length > 0 && (
        <MultitrackPlayerLoader
          song={song}
          songs={songs ?? []}
          tracks={tracks}
          onUpdateTrack={(input) => updateTrack.mutate(input)}
          onEditSong={() => setEditOpen(true)}
          onDeleteTrack={(trackId) =>
            deleteTrack.mutate(trackId, { onError: () => toast.error("No se pudo eliminar la pista") })
          }
          onUploadTrack={handleUploadTrack}
          isUploadingTrack={isUploading}
        />
      )}

      {tracks && tracks.length === 0 && (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-white/12 bg-white/2 px-6 py-10 text-center hover:border-white/25">
          <input
            type="file"
            accept="audio/wav,audio/mpeg,audio/flac,audio/aiff,audio/ogg,audio/mp4,.wav,.mp3,.flac,.aiff,.aif,.ogg,.m4a"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleUploadTrack(file);
            }}
          />
          <Upload className="size-5 text-white/40" />
          <p className="text-sm text-white/50">
            {isUploading ? (
              "Subiendo..."
            ) : (
              <>
                Sube la primera pista de <span className="text-white">{song?.title}</span> para activar el
                reproductor.
              </>
            )}
          </p>
        </label>
      )}
    </div>
  );
}
