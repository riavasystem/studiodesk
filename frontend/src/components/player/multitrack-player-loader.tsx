"use client";

import dynamic from "next/dynamic";
import type { ITrack } from "@/hooks/use-tracks";

const MultitrackPlayer = dynamic(
  () => import("./multitrack-player").then((mod) => mod.MultitrackPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] text-xs text-white/40">
        Cargando reproductor...
      </div>
    ),
  },
);

interface IMultitrackPlayerLoaderProps {
  tracks: ITrack[];
  onUpdateTrack: (input: {
    id: number;
    name: string;
    file_path: string;
    order_index: number;
    volume: number;
    is_muted: boolean;
    is_solo: boolean;
  }) => void;
}

export function MultitrackPlayerLoader(props: IMultitrackPlayerLoaderProps) {
  return <MultitrackPlayer {...props} />;
}
