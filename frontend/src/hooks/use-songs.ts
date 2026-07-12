import { useQuery } from "@tanstack/react-query";
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

export function useSongs() {
  return useQuery({
    queryKey: ["songs"],
    queryFn: () => apiFetch<ISong[]>("/songs"),
  });
}
