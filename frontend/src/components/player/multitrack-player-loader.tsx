"use client";

import dynamic from "next/dynamic";
import type { ITrack, TrackType } from "@/hooks/use-tracks";
import type { ISong } from "@/hooks/use-songs";

const MultitrackPlayer = dynamic(
  () => import("./multitrack-player").then((mod) => mod.MultitrackPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/8 bg-white/2 text-xs text-white/40">
        Cargando reproductor...
      </div>
    ),
  },
);

interface IMultitrackPlayerLoaderProps {
  song: ISong;
  songs: ISong[];
  tracks: ITrack[];
  onUpdateTrack: (input: {
    id: number;
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
  }) => void;
  onEditSong: () => void;
}

export function MultitrackPlayerLoader(props: IMultitrackPlayerLoaderProps) {
  return <MultitrackPlayer {...props} />;
}
