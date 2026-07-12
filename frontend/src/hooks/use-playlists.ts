import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface IPlaylist {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface IPlaylistSong {
  id: number;
  playlist_id: number;
  song_id: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export function usePlaylists() {
  return useQuery({
    queryKey: ["playlists"],
    queryFn: () => apiFetch<IPlaylist[]>("/playlists"),
  });
}

export function usePlaylistSongs(playlistId: number) {
  return useQuery({
    queryKey: ["playlist-songs", playlistId],
    queryFn: () => apiFetch<IPlaylistSong[]>(`/playlists/${playlistId}/songs`),
    enabled: !!playlistId,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiFetch<IPlaylist>("/playlists", { method: "POST", body: { name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/playlists/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
  });
}

export function useAddSongToPlaylist(playlistId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ songId, orderIndex }: { songId: number; orderIndex?: number }) =>
      apiFetch<IPlaylistSong>(`/playlists/${playlistId}/songs`, {
        method: "POST",
        body: { song_id: songId, order_index: orderIndex ?? 0 },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlist-songs", playlistId] }),
  });
}

export function useRemoveSongFromPlaylist(playlistId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      apiFetch<void>(`/playlists/${playlistId}/songs/${itemId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlist-songs", playlistId] }),
  });
}
