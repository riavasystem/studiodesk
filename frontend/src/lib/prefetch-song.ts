import type { useRouter } from "next/navigation";
import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ISong } from "@/hooks/use-songs";
import type { ITrack } from "@/hooks/use-tracks";
import type { ISongMarker } from "@/hooks/use-markers";
import type { ISequenceItem } from "@/hooks/use-sequence";

/** Warms the React Query cache for everything a song's player page needs
 * (song data, tracks, markers, sequence) so navigating there — e.g. the
 * queue's auto-advance, or opening a saved playlist — doesn't have to wait
 * on these requests before it can start loading audio. */
export function prefetchSongForPlayer(queryClient: QueryClient, songId: number) {
  queryClient.prefetchQuery({ queryKey: ["songs", songId], queryFn: () => apiFetch<ISong>(`/songs/${songId}`) });
  queryClient.prefetchQuery({
    queryKey: ["tracks", songId],
    queryFn: () => apiFetch<ITrack[]>(`/tracks?song_id=${songId}`),
  });
  queryClient.prefetchQuery({
    queryKey: ["markers", songId],
    queryFn: () => apiFetch<ISongMarker[]>(`/playback/markers?song_id=${songId}`),
  });
  queryClient.prefetchQuery({
    queryKey: ["sequence", songId],
    queryFn: () => apiFetch<ISequenceItem[]>(`/playback/sequence?song_id=${songId}`),
  });
}

/** Seeds the queue and jumps into the player for a saved project — prefetching
 * every song in it up front (not just the first), so by the time the queue's
 * auto-advance reaches the 2nd, 3rd, etc. song, its data is already warm and
 * doesn't add a loading delay between songs. */
export function openProjectInPlayer(
  router: ReturnType<typeof useRouter>,
  queryClient: QueryClient,
  setQueue: (songIds: number[]) => void,
  orderedSongIds: number[],
) {
  if (orderedSongIds.length === 0) return;
  setQueue(orderedSongIds);
  for (const songId of orderedSongIds) {
    router.prefetch(`/dashboard/songs/${songId}`);
    prefetchSongForPlayer(queryClient, songId);
  }
  router.push(`/dashboard/songs/${orderedSongIds[0]}?autoplay=1`);
}
