import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface IYouTubeStatus {
  connected: boolean;
  google_email: string | null;
}

export interface IYouTubeVideo {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
}

export interface IYouTubeVideoList {
  videos: IYouTubeVideo[];
  next_page_token: string | null;
}

export function useYouTubeStatus() {
  return useQuery({
    queryKey: ["youtube-status"],
    queryFn: () => apiFetch<IYouTubeStatus>("/youtube/status"),
  });
}

export function useYouTubeAuthUrl() {
  return useMutation({
    mutationFn: () => apiFetch<{ url: string }>("/youtube/oauth/start"),
  });
}

export function useYouTubeVideos(pageToken: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["youtube-videos", pageToken],
    queryFn: () =>
      apiFetch<IYouTubeVideoList>(
        `/youtube/my-videos${pageToken ? `?page_token=${encodeURIComponent(pageToken)}` : ""}`,
      ),
    enabled,
  });
}

export function useDisconnectYouTube() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>("/youtube/disconnect", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["youtube-status"] }),
  });
}
