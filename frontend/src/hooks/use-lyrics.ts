import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ILyricLine {
  id: number;
  song_id: number;
  order_index: number;
  time_seconds: number;
  text: string;
  chord: string | null;
  created_at: string;
  updated_at: string;
}

export interface ILyricLineInput {
  song_id: number;
  order_index?: number;
  time_seconds: number;
  text: string;
  chord?: string | null;
}

export function useLyrics(songId: number) {
  return useQuery({
    queryKey: ["lyrics", songId],
    queryFn: () => apiFetch<ILyricLine[]>(`/lyrics?song_id=${songId}`),
    enabled: !!songId,
  });
}

export function useCreateLyricLine(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ILyricLineInput, "song_id">) =>
      apiFetch<ILyricLine>("/lyrics", { method: "POST", body: { ...input, song_id: songId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lyrics", songId] }),
  });
}

export function useUpdateLyricLine(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Omit<ILyricLineInput, "song_id">) =>
      apiFetch<ILyricLine>(`/lyrics/${id}`, { method: "PUT", body: { ...input, song_id: songId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lyrics", songId] }),
  });
}

export function useDeleteLyricLine(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/lyrics/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lyrics", songId] }),
  });
}
