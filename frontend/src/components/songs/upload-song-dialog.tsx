"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MusicLoader } from "@/components/ui/music-loader";
import { useCreateSong } from "@/hooks/use-songs";
import { useSeparateStems, useStemJob } from "@/hooks/use-stems";

function stemStatusLabel(status?: string): string {
  switch (status) {
    case "converting":
      return "Convirtiendo audio...";
    case "processing":
      return "Separando pistas (voz, batería, bajo, guitarra, piano, otros)...";
    default:
      return "Subiendo archivo...";
  }
}

interface IUploadSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadSongDialog({ open, onOpenChange }: IUploadSongDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [songId, setSongId] = useState<number | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createSong = useCreateSong();
  const separateStems = useSeparateStems();
  const { data: stemJob } = useStemJob(jobId);

  const resetAndClose = (next: boolean) => {
    if (!next) {
      setTitle("");
      setArtist("");
      setFile(null);
      setSongId(null);
      setJobId(null);
      setSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setSubmitting(true);
    try {
      const song = await createSong.mutateAsync({ title, artist: artist || "Sin artista" });
      setSongId(song.id);
      const job = await separateStems.mutateAsync({ file, songId: song.id });
      setJobId(job.id);
    } catch {
      toast.error("No se pudo subir la canción");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!songId) return;
    if (stemJob?.status === "completed") {
      toast.success("Canción separada en pistas");
      resetAndClose(false);
      router.push(`/dashboard/songs/${songId}`);
    } else if (stemJob?.status === "failed") {
      toast.error(stemJob.error_message ?? "No se pudo separar la canción");
      setSubmitting(false);
      setJobId(null);
      setSongId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stemJob, songId]);

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir canción</DialogTitle>
        </DialogHeader>

        {submitting ? (
          <MusicLoader label={stemStatusLabel(stemJob?.status)} progress={stemJob?.progress_percent} />
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upload-title">Título</Label>
              <Input id="upload-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upload-artist">Artista</Label>
              <Input id="upload-artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upload-file">Archivo (.mp3 o .mp4)</Label>
              <input
                id="upload-file"
                type="file"
                accept="audio/wav,audio/mpeg,audio/mp4,video/mp4,.wav,.mp3,.m4a,.mp4,.mov,.webm,.mkv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white/80"
              />
              <p className="text-xs text-white/40">
                Separamos automáticamente voz, batería, bajo, guitarra, piano y otros instrumentos (puede tardar
              varios minutos).
              </p>
            </div>
            <Button type="submit" disabled={!file || !title.trim()} className="mt-1 self-start">
              <Music2 className="size-4" />
              Subir y separar
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
