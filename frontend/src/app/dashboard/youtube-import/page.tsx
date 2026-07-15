"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, LogOut, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MusicLoader } from "@/components/ui/music-loader";
import {
  useDisconnectYouTube,
  useYouTubeAuthUrl,
  useYouTubeStatus,
  useYouTubeVideos,
  type IYouTubeVideo,
} from "@/hooks/use-youtube";
import { useCreateSong } from "@/hooks/use-songs";
import { useSeparateStems, useStemJob } from "@/hooks/use-stems";

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "short", day: "numeric" });
}

function stemStatusLabel(status?: string): string {
  switch (status) {
    case "converting":
      return "Convirtiendo audio...";
    case "processing":
      return "Separando pistas (voz, batería, bajo, guitarra, piano, otros)...";
    case "completed":
      return "¡Listo!";
    default:
      return "Subiendo archivo...";
  }
}

export default function YouTubeImportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Cargando...</p>}>
      <YouTubeImportContent />
    </Suspense>
  );
}

function YouTubeImportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useYouTubeStatus();
  const authUrl = useYouTubeAuthUrl();
  const disconnect = useDisconnectYouTube();
  const { data: videoList, isLoading: videosLoading } = useYouTubeVideos(null, !!status?.connected);

  const [selected, setSelected] = useState<IYouTubeVideo | null>(null);
  const [creating, setCreating] = useState(false);
  const [songId, setSongId] = useState<number | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSong = useCreateSong();
  const separateStems = useSeparateStems();
  const { data: stemJob } = useStemJob(jobId);

  useEffect(() => {
    if (!songId) return;
    if (stemJob?.status === "completed") {
      toast.success("Canción separada en pistas");
      router.push(`/dashboard/songs/${songId}`);
    } else if (stemJob?.status === "failed") {
      toast.error(stemJob.error_message ?? "No se pudo separar la canción");
      setCreating(false);
      setJobId(null);
      setSongId(null);
    }
  }, [stemJob, songId, router]);

  useEffect(() => {
    if (searchParams.get("connected")) {
      toast.success("Cuenta de YouTube conectada");
      refetchStatus();
      router.replace("/dashboard/youtube-import");
    } else if (searchParams.get("error")) {
      toast.error("No se pudo conectar la cuenta de YouTube");
      router.replace("/dashboard/youtube-import");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnect = () => {
    authUrl.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: () => toast.error("No se pudo iniciar la conexión con YouTube"),
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected) return;

    setCreating(true);
    try {
      const song = await createSong.mutateAsync({
        title: selected.title,
        artist: status?.google_email ?? "YouTube",
        cover_image_url: selected.thumbnail_url,
      });
      setSongId(song.id);
      const job = await separateStems.mutateAsync({ file, songId: song.id });
      setJobId(job.id);
    } catch {
      toast.error("No se pudo crear la canción a partir del archivo");
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Importar</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Desde YouTube</h1>
        <p className="mt-1 text-sm text-white/45">
          Solo para videos que subiste vos mismo a tu propio canal (verificado por tu cuenta de Google).
        </p>
      </div>

      {statusLoading && <p className="text-sm text-white/50">Cargando...</p>}

      {!statusLoading && !status?.connected && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/2 px-6 py-14 text-center">
          <Video className="size-10 text-red-500" />
          <div>
            <p className="text-base font-medium text-white">Conectá tu cuenta de YouTube</p>
            <p className="mt-1 text-sm text-white/45">
              Vamos a mostrarte únicamente los videos de tu propio canal.
            </p>
          </div>
          <Button onClick={handleConnect} disabled={authUrl.isPending}>
            {authUrl.isPending ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
            Conectar cuenta de YouTube
          </Button>
        </div>
      )}

      {!statusLoading && status?.connected && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="size-4" /> Conectado como {status.google_email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => disconnect.mutate(undefined, { onSuccess: () => refetchStatus() })}
            >
              <LogOut className="size-3.5" /> Desconectar
            </Button>
          </div>

          {videosLoading && <p className="text-sm text-white/50">Cargando tus videos...</p>}

          {videoList && videoList.videos.length === 0 && (
            <p className="text-sm text-white/50">No encontramos videos en tu canal.</p>
          )}

          {videoList && videoList.videos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {videoList.videos.map((video) => (
                <button
                  key={video.video_id}
                  onClick={() => setSelected(video)}
                  className={`group flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-colors ${
                    selected?.video_id === video.video_id
                      ? "border-orange-400/60 bg-orange-400/10"
                      : "border-white/8 hover:border-white/20"
                  }`}
                >
                  <div className="aspect-video overflow-hidden rounded-lg bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={video.thumbnail_url} alt={video.title} className="size-full object-cover" />
                  </div>
                  <p className="truncate text-xs font-medium text-white">{video.title}</p>
                  <p className="text-[10px] text-white/35">{formatDate(video.published_at)}</p>
                </button>
              ))}
            </div>
          )}

          {selected && !creating && (
            <div className="flex flex-col gap-3 rounded-2xl border border-orange-400/30 bg-orange-400/5 p-5">
              <p className="text-sm font-medium text-white">Video seleccionado: {selected.title}</p>
              <ol className="flex flex-col gap-2 text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px]">
                    1
                  </span>
                  Abrí YouTube Studio y descargá el archivo original de tu video.
                  <a
                    href={`https://studio.youtube.com/video/${selected.video_id}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-orange-300 hover:border-orange-400/40"
                  >
                    Abrir <ExternalLink className="size-3" />
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px]">
                    2
                  </span>
                  Subí acá ese archivo (.mp4 está bien) — separamos automáticamente voz, batería, bajo, guitarra,
                  piano y otros instrumentos.
                </li>
              </ol>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/wav,audio/mpeg,audio/mp4,video/mp4,.wav,.mp3,.m4a,.mp4,.mov,.webm,.mkv"
                className="hidden"
                onChange={handleFileSelected}
              />
              <Button onClick={() => fileInputRef.current?.click()} className="self-start">
                <Upload className="size-4" />
                Subir archivo descargado
              </Button>
            </div>
          )}

          {creating && (
            <div className="rounded-2xl border border-orange-400/30 bg-orange-400/5 p-5">
              <MusicLoader label={stemStatusLabel(stemJob?.status)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
