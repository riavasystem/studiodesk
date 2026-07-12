"use client";

import { toast } from "sonner";
import {
  Bluetooth,
  ListMusic,
  MicVocal,
  Music4,
  Radio,
  Settings,
  SlidersHorizontal,
  Timer,
} from "lucide-react";

export type PlayerPanel = "mixer" | "lyrics";

interface IPlayerSidebarProps {
  panel: PlayerPanel;
  onPanelChange: (panel: PlayerPanel) => void;
  metronomeOn: boolean;
  onToggleMetronome: () => void;
}

const UNAVAILABLE_MESSAGE = "No disponible en esta versión";

function InertButton({ icon: Icon, label }: { icon: typeof Settings; label: string }) {
  return (
    <button
      onClick={() => toast(UNAVAILABLE_MESSAGE)}
      title={label}
      className="flex size-9 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/8 hover:text-white/70"
    >
      <Icon className="size-4" />
    </button>
  );
}

export function PlayerSidebar({ panel, onPanelChange, metronomeOn, onToggleMetronome }: IPlayerSidebarProps) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-black/20 p-2">
      <button
        onClick={() => onPanelChange("mixer")}
        title="Mixer"
        className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
          panel === "mixer" ? "bg-orange-500/20 text-orange-400" : "text-white/50 hover:bg-white/8 hover:text-white"
        }`}
      >
        <SlidersHorizontal className="size-4" />
      </button>
      <button
        onClick={() => onPanelChange("lyrics")}
        title="Letras y acordes"
        className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
          panel === "lyrics" ? "bg-orange-500/20 text-orange-400" : "text-white/50 hover:bg-white/8 hover:text-white"
        }`}
      >
        <MicVocal className="size-4" />
      </button>

      <div className="my-1 h-px w-6 bg-white/8" />

      <button
        onClick={onToggleMetronome}
        title="Metrónomo"
        className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
          metronomeOn ? "bg-orange-500/20 text-orange-400" : "text-white/50 hover:bg-white/8 hover:text-white"
        }`}
      >
        <Timer className="size-4" />
      </button>

      <div className="my-1 h-px w-6 bg-white/8" />

      <InertButton icon={ListMusic} label="Playlist" />
      <InertButton icon={Music4} label="Cues" />
      <InertButton icon={Radio} label="Outputs" />
      <InertButton icon={Bluetooth} label="Bluetooth / MIDI" />
      <InertButton icon={Settings} label="Ajustes" />
    </div>
  );
}
