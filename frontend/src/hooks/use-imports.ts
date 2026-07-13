import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchUploadWithProgress } from "@/lib/api-client";

export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export interface IImportJob {
  id: number;
  owner_id: number;
  song_id: number | null;
  status: ImportStatus;
  original_filename: string;
  total_files: number;
  processed_files: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface IUploadProgress {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedBytesPerSecond: number;
  etaSeconds: number | null;
}

export function useImportJob(jobId: number | null) {
  return useQuery({
    queryKey: ["import-job", jobId],
    queryFn: () => apiFetch<IImportJob>(`/imports/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 1500;
    },
  });
}

export function useZipImport() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<IUploadProgress | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const startTimeRef = useRef<number>(0);

  const upload = useCallback((file: File) => {
    setError(null);
    setJobId(null);
    startTimeRef.current = Date.now();
    setUploadProgress({ percent: 0, loadedBytes: 0, totalBytes: file.size, speedBytesPerSecond: 0, etaSeconds: null });

    const { promise, abort } = apiFetchUploadWithProgress<IImportJob>("/imports/zip", file, (loaded, total) => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const speed = elapsedSeconds > 0 ? loaded / elapsedSeconds : 0;
      const remaining = total - loaded;
      setUploadProgress({
        percent: total > 0 ? (loaded / total) * 100 : 0,
        loadedBytes: loaded,
        totalBytes: total,
        speedBytesPerSecond: speed,
        etaSeconds: speed > 0 ? remaining / speed : null,
      });
    });

    abortRef.current = abort;

    promise
      .then((job) => {
        setJobId(job.id);
        queryClient.invalidateQueries({ queryKey: ["songs"] });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudo importar el ZIP");
      })
      .finally(() => {
        abortRef.current = null;
      });
  }, [queryClient]);

  const cancel = useCallback(() => {
    abortRef.current?.();
  }, []);

  return { upload, cancel, uploadProgress, jobId, error };
}
