import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchUpload } from "@/lib/api-client";

export type StemJobStatus = "pending" | "converting" | "processing" | "completed" | "failed";

export interface IStemJob {
  id: number;
  owner_id: number;
  song_id: number;
  status: StemJobStatus;
  original_filename: string;
  duration_seconds: number | null;
  stems_created: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useStemJob(jobId: number | null) {
  return useQuery({
    queryKey: ["stem-job", jobId],
    queryFn: () => apiFetch<IStemJob>(`/stems/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 1500;
    },
  });
}

export function useSeparateStems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, songId }: { file: File; songId: number }) =>
      apiFetchUpload<IStemJob>("/stems/separate", file, { song_id: String(songId) }),
    onSuccess: (job) => queryClient.invalidateQueries({ queryKey: ["tracks", job.song_id] }),
  });
}
