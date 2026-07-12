import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface IAlbum {
  id: number;
  title: string;
  artist: string;
  cover_image_path: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface IAlbumInput {
  title: string;
  artist: string;
  cover_image_path?: string | null;
}

export function useAlbums() {
  return useQuery({
    queryKey: ["albums"],
    queryFn: () => apiFetch<IAlbum[]>("/albums"),
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IAlbumInput) => apiFetch<IAlbum>("/albums", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/albums/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albums"] }),
  });
}
