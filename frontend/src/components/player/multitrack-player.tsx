"use client";

import { useState } from "react";
import { Pause, Play, Plus, Repeat, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { TrackWaveform } from "@/components/player/track-waveform";
import { LevelMeter } from "@/components/player/level-meter";
import { useMultitrackPlayer } from "@/hooks/use-multitrack-player";
import type { ITrack } from "@/hooks/use-tracks";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface IMultitrackPlayerProps {
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

export function MultitrackPlayer({ tracks, onUpdateTrack }: IMultitrackPlayerProps) {
  const player = useMultitrackPlayer(tracks);
  const [markerLabel, setMarkerLabel] = useState("");

  const setMix = (id: number, patch: Partial<Pick<ITrack, "volume" | "is_muted" | "is_solo">>) => {
    const target = tracks.find((t) => t.id === id);
    if (!target) return;
    const updated = { ...target, ...patch };

    if (patch.volume !== undefined) player.setTrackVolume(id, patch.volume);
    if (patch.is_muted !== undefined || patch.is_solo !== undefined) {
      player.setTrackMixState(
        tracks.map((t) =>
          t.id === id
            ? { id: t.id, isMuted: updated.is_muted, isSolo: updated.is_solo }
            : { id: t.id, isMuted: t.is_muted, isSolo: t.is_solo },
        ),
      );
    }

    onUpdateTrack({
      id: updated.id,
      name: updated.name,
      file_path: updated.file_path,
      order_index: updated.order_index,
      volume: updated.volume,
      is_muted: updated.is_muted,
      is_solo: updated.is_solo,
    });
  };

  if (tracks.length === 0) return null;

  const anySolo = tracks.some((t) => t.is_solo);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.35em] text-orange-400/80 uppercase">Consola</p>
          <h2 className="text-sm font-semibold text-white">Reproductor multipista</h2>
        </div>
        {player.isLoading && (
          <span className="animate-pulse text-[11px] text-white/40">Cargando audio…</span>
        )}
      </div>

      <div className="flex flex-col gap-6 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/30 p-1.5 shadow-inner">
            <Button
              size="icon"
              className="rounded-lg bg-orange-500 text-black shadow-[0_0_16px_rgba(255,138,31,0.45)] hover:bg-orange-400"
              onClick={player.isPlaying ? player.pause : player.play}
              disabled={!player.isReady}
            >
              {player.isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              onClick={player.stop}
              disabled={!player.isReady}
            >
              <Square className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`rounded-lg ${
                player.loop
                  ? "bg-orange-500/20 text-orange-400 shadow-[0_0_10px_rgba(255,138,31,0.3)]"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              onClick={() => player.setLoop(!player.loop)}
              disabled={!player.isReady}
            >
              <Repeat className="size-4" />
            </Button>
          </div>

          <span className="rounded-md border border-white/[0.06] bg-black/30 px-2.5 py-1.5 font-mono text-xs tabular-nums text-white/70">
            {formatTime(player.currentTime)} <span className="text-white/25">/</span> {formatTime(player.duration)}
          </span>
        </div>

        <Slider
          min={0}
          max={player.duration || 1}
          step={0.1}
          value={[Math.min(player.currentTime, player.duration || 1)]}
          onValueChange={(value) => player.seekTo(Array.isArray(value) ? value[0] : value)}
          disabled={!player.isReady}
        />

        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex min-w-48 flex-1 items-center gap-3">
            <Label className="w-14 font-mono text-[10px] tracking-widest text-white/40 uppercase">Tempo</Label>
            <Slider
              className="flex-1"
              min={0.5}
              max={1.5}
              step={0.01}
              value={[player.tempo]}
              onValueChange={(value) => player.setTempo(Array.isArray(value) ? value[0] : value)}
            />
            <span className="w-12 text-right font-mono text-xs tabular-nums text-white/50">
              {Math.round(player.tempo * 100)}%
            </span>
          </div>
          <div className="flex min-w-48 flex-1 items-center gap-3">
            <Label className="w-14 font-mono text-[10px] tracking-widest text-white/40 uppercase">Pitch</Label>
            <Slider
              className="flex-1"
              min={-12}
              max={12}
              step={1}
              value={[player.pitch]}
              onValueChange={(value) => player.setPitch(Array.isArray(value) ? value[0] : value)}
            />
            <span className="w-12 text-right font-mono text-xs tabular-nums text-white/50">
              {player.pitch > 0 ? `+${player.pitch}` : player.pitch}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Marcadores</span>
            <input
              className="h-7 flex-1 rounded-md border border-white/[0.06] bg-black/20 px-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
              placeholder="Nombre del marcador"
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
            />
            <Button
              size="icon"
              variant="ghost"
              className="rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => {
                player.addMarker(markerLabel || `Marca ${player.markers.length + 1}`, player.currentTime);
                setMarkerLabel("");
              }}
              disabled={!player.isReady}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {player.markers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {player.markers.map((marker) => (
                <span
                  key={marker.time}
                  className="flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 py-1 pr-1 pl-2.5 text-[11px] text-orange-300"
                >
                  <button className="cursor-pointer font-mono" onClick={() => player.seekTo(marker.time)}>
                    {marker.label} · {formatTime(marker.time)}
                  </button>
                  <button
                    className="rounded-full p-0.5 hover:bg-orange-400/20"
                    onClick={() => player.removeMarker(marker.time)}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-2">
          {tracks.map((track) => {
            const url = player.trackUrls.get(track.id);
            const level = player.trackLevels.get(track.id) ?? 0;
            const audible = anySolo ? track.is_solo : !track.is_muted;

            return (
              <div
                key={track.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
                  audible && player.isPlaying
                    ? "border-orange-400/20 bg-gradient-to-b from-orange-400/[0.04] to-white/[0.02]"
                    : "border-white/[0.06] bg-white/[0.015]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${
                        audible && player.isPlaying ? "bg-orange-400 shadow-[0_0_8px_rgba(255,138,31,0.8)]" : "bg-white/15"
                      }`}
                    />
                    <span className="text-sm font-medium text-white">{track.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMix(track.id, { is_muted: !track.is_muted })}
                      className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold tracking-wide transition-all ${
                        track.is_muted
                          ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                          : "bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70"
                      }`}
                    >
                      MUTE
                    </button>
                    <button
                      onClick={() => setMix(track.id, { is_solo: !track.is_solo })}
                      className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold tracking-wide transition-all ${
                        track.is_solo
                          ? "bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                          : "bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70"
                      }`}
                    >
                      SOLO
                    </button>
                  </div>
                </div>

                {url && (
                  <TrackWaveform
                    url={url}
                    currentTime={player.currentTime}
                    duration={player.duration}
                    isMuted={track.is_muted}
                    onSeek={player.seekTo}
                  />
                )}

                <div className="flex items-center gap-3">
                  <LevelMeter level={level} active={audible} />
                  <Slider
                    className="flex-1"
                    min={0}
                    max={2}
                    step={0.01}
                    value={[track.volume]}
                    onValueChange={(value) => setMix(track.id, { volume: Array.isArray(value) ? value[0] : value })}
                  />
                  <span className="w-9 text-right font-mono text-[10px] tabular-nums text-white/40">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
