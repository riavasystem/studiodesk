import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ISong {
  id: number;
  title: string;
  artist: string;
  bpm: number | null;
  musical_key: string | null;
  duration_seconds: number | null;
  category_id: number | null;
  album_id: number | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface ISongInput {
  title: string;
  artist: string;
  bpm?: number | null;
  musical_key?: string | null;
  duration_seconds?: number | null;
  category_id?: number | null;
  album_id?: number | null;
}

export function useSongs() {
  return useQuery({
    queryKey: ["songs"],
    queryFn: () => apiFetch<ISong[]>("/songs"),
  });
}

export function useSong(id: number) {
  return useQuery({
    queryKey: ["songs", id],
    queryFn: () => apiFetch<ISong>(`/songs/${id}`),
    enabled: !!id,
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ISongInput) => apiFetch<ISong>("/songs", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["songs"] }),
  });
}

export function useUpdateSong(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ISongInput) => apiFetch<ISong>(`/songs/${id}`, { method: "PUT", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      queryClient.invalidateQueries({ queryKey: ["songs", id] });
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/songs/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["songs"] }),
  });
}
