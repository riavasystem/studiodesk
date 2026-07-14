import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export type MarkerType =
  | "intro"
  | "verse"
  | "prechorus"
  | "chorus"
  | "bridge"
  | "solo"
  | "outro"
  | "ending"
  | "loop"
  | "cue"
  | "click";

export interface ISongMarker {
  id: number;
  song_id: number;
  label: string;
  marker_type: MarkerType;
  color: string;
  position_seconds: number;
  loop_end_seconds: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ISongMarkerInput {
  song_id: number;
  label: string;
  marker_type: MarkerType;
  color: string;
  position_seconds: number;
  loop_end_seconds?: number | null;
  order_index?: number;
}

export const MARKER_TYPE_COLORS: Record<MarkerType, string> = {
  intro: "#38bdf8",
  verse: "#34d399",
  prechorus: "#a78bfa",
  chorus: "#f97316",
  bridge: "#e879f9",
  solo: "#facc15",
  outro: "#fb7185",
  ending: "#94a3b8",
  loop: "#22d3ee",
  cue: "#f97316",
  click: "#64748b",
};

export function useMarkers(songId: number) {
  return useQuery({
    queryKey: ["markers", songId],
    queryFn: () => apiFetch<ISongMarker[]>(`/playback/markers?song_id=${songId}`),
    enabled: !!songId,
  });
}

export function useCreateMarker(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ISongMarkerInput, "song_id">) =>
      apiFetch<ISongMarker>("/playback/markers", { method: "POST", body: { ...input, song_id: songId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["markers", songId] }),
  });
}

export function useUpdateMarker(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Omit<ISongMarkerInput, "song_id">) =>
      apiFetch<ISongMarker>(`/playback/markers/${id}`, { method: "PUT", body: { ...input, song_id: songId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["markers", songId] }),
  });
}

export function useDeleteMarker(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/playback/markers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["markers", songId] }),
  });
}

export function useAutoDetectMarkers(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ISongMarker[]>(`/playback/markers/auto-detect?song_id=${songId}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["markers", songId] }),
  });
}
