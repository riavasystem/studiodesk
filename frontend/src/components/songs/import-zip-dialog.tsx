"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { FileArchive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useImportJob, useZipImport } from "@/hooks/use-imports";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.ceil(seconds % 60);
  return `${minutes}m ${rest}s`;
}

interface IImportZipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportZipDialog({ open, onOpenChange }: IImportZipDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, cancel, uploadProgress, jobId, error } = useZipImport();
  const { data: job } = useImportJob(jobId);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload(file);
  };

  const handleClose = (next: boolean) => {
    if (!next && (uploadProgress || jobId)) cancel();
    onOpenChange(next);
  };

  const isUploading = uploadProgress !== null && uploadProgress.percent < 100 && !jobId;
  const isExtracting = job && job.status !== "completed" && job.status !== "failed";
  const isDone = job?.status === "completed";
  const isFailed = job?.status === "failed" || !!error;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar canción desde ZIP</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          {!uploadProgress && !jobId && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/2 px-6 py-10 text-center transition-colors hover:border-orange-400/50 hover:bg-white/4"
              >
                <FileArchive className="size-8 text-white/40" strokeWidth={1.5} />
                <span className="text-sm text-white/70">Selecciona un archivo .zip (hasta 990 MB)</span>
                <span className="text-xs text-white/40">
                  Se detectarán automáticamente las pistas .wav / .mp3 dentro del ZIP
                </span>
              </button>
            </>
          )}

          {isUploading && uploadProgress && (
            <div className="flex flex-col gap-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] text-white/45">
                <span>
                  {formatBytes(uploadProgress.loadedBytes)} / {formatBytes(uploadProgress.totalBytes)} (
                  {uploadProgress.percent.toFixed(0)}%)
                </span>
                <span>
                  {formatBytes(uploadProgress.speedBytesPerSecond)}/s
                  {uploadProgress.etaSeconds !== null && ` · ETA ${formatSeconds(uploadProgress.etaSeconds)}`}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={cancel} className="mt-1 w-fit text-white/50">
                Cancelar
              </Button>
            </div>
          )}

          {isExtracting && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="size-6 animate-spin text-orange-400" />
              <p className="text-sm text-white/70">Procesando pistas...</p>
              {job.total_files > 0 && (
                <p className="font-mono text-xs text-white/45">
                  {job.processed_files} / {job.total_files} pistas
                </p>
              )}
            </div>
          )}

          {isFailed && (
            <div className="flex flex-col gap-3 py-4 text-center">
              <p className="text-sm text-red-400">
                {job?.error_message ?? error ?? "No se pudo importar el ZIP"}
              </p>
              <Button variant="ghost" size="sm" onClick={() => handleClose(false)} className="mx-auto w-fit">
                Cerrar
              </Button>
            </div>
          )}

          {isDone && job?.song_id && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-white/80">
                Importación completa: {job.processed_files} pistas detectadas.
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/dashboard/songs/${job.song_id}`);
                }}
              >
                Ver canción
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
