import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchUpload } from "@/lib/api-client";

export type TrackType =
  | "drums"
  | "kick"
  | "snare"
  | "hihat"
  | "percussion"
  | "bass"
  | "guitar_electric"
  | "guitar_acoustic"
  | "piano"
  | "pad"
  | "strings"
  | "brass"
  | "fx"
  | "loops"
  | "click"
  | "guide"
  | "lead_vocal"
  | "backing_vocal"
  | "choir"
  | "narration"
  | "midi"
  | "other";

export interface ITrack {
  id: number;
  song_id: number;
  name: string;
  file_path: string;
  order_index: number;
  volume: number;
  pan: number;
  is_muted: boolean;
  is_solo: boolean;
  is_phase_inverted: boolean;
  color: string;
  track_type: TrackType;
  is_hidden: boolean;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface IAudioFile {
  id: number;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_id: number;
  created_at: string;
  updated_at: string;
}

interface ITrackInput {
  song_id: number;
  name: string;
  file_path: string;
  order_index?: number;
  volume?: number;
  pan?: number;
  is_muted?: boolean;
  is_solo?: boolean;
  is_phase_inverted?: boolean;
  color?: string;
  track_type?: TrackType;
  is_hidden?: boolean;
  duration_seconds?: number | null;
}

export function useTracks(songId: number) {
  return useQuery({
    queryKey: ["tracks", songId],
    queryFn: () => apiFetch<ITrack[]>(`/tracks?song_id=${songId}`),
    enabled: !!songId,
  });
}

export function useUploadAudio() {
  return useMutation({
    mutationFn: (file: File) => apiFetchUpload<IAudioFile>("/storage/upload", file),
  });
}

export function useCreateTrack(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ITrackInput, "song_id">) =>
      apiFetch<ITrack>("/tracks", { method: "POST", body: { ...input, song_id: songId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracks", songId] }),
  });
}

export function useUpdateTrack(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Omit<ITrackInput, "song_id">) =>
      apiFetch<ITrack>(`/tracks/${id}`, { method: "PUT", body: { ...input, song_id: songId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracks", songId] }),
  });
}

export function useDeleteTrack(songId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/tracks/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracks", songId] }),
  });
}
