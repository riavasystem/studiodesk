import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ISequenceItem {
  id: number;
  song_id: number;
  marker_id: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export function useSequence(songId: number) {
  return useQuery({
    queryKey: ["sequence", songId],
    queryFn: () => apiFetch<ISequenceItem[]>(`/playback/sequence?song_id=${songId}`),
    enabled: !!songId,
  });
}

export function useAppendSequenceItem(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { marker_id: number; order_index?: number }) =>
      apiFetch<ISequenceItem>("/playback/sequence", {
        method: "POST",
        body: { song_id: songId, ...input },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sequence", songId] }),
  });
}

export function useReorderSequence(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: number[]) =>
      apiFetch<ISequenceItem[]>(`/playback/sequence/reorder?song_id=${songId}`, {
        method: "PUT",
        body: { item_ids: itemIds },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sequence", songId] }),
  });
}

export function useRemoveSequenceItem(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => apiFetch<void>(`/playback/sequence/${itemId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sequence", songId] }),
  });
}
