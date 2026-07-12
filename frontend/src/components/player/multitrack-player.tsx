"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Music2, Pause, Play, Plus, Repeat, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { VerticalMeter } from "@/components/player/vertical-meter";
import { TrackWaveform } from "@/components/player/track-waveform";
import { useMultitrackPlayer } from "@/hooks/use-multitrack-player";
import type { ITrack } from "@/hooks/use-tracks";
import type { ISong } from "@/hooks/use-songs";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MARKER_COLORS = [
  "border-sky-400/40 bg-sky-400/15 text-sky-300",
  "border-emerald-400/40 bg-emerald-400/15 text-emerald-300",
  "border-violet-400/40 bg-violet-400/15 text-violet-300",
  "border-orange-400/40 bg-orange-400/15 text-orange-300",
  "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-300",
];

interface IMultitrackPlayerProps {
  song: ISong;
  songs: ISong[];
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

export function MultitrackPlayer({ song, songs, tracks, onUpdateTrack }: IMultitrackPlayerProps) {
  const player = useMultitrackPlayer(tracks);
  const [markerLabel, setMarkerLabel] = useState("");
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const commitRename = (track: ITrack) => {
    const name = editingName.trim();
    setEditingTrackId(null);
    if (!name || name === track.name) return;
    onUpdateTrack({
      id: track.id,
      name,
      file_path: track.file_path,
      order_index: track.order_index,
      volume: track.volume,
      is_muted: track.is_muted,
      is_solo: track.is_solo,
    });
  };

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

  const anySolo = tracks.some((t) => t.is_solo);
  const mainUrl = player.trackUrls.get(tracks[0]?.id);

  return (
    <div className="flex flex-col gap-3">
      {/* Transport bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-transparent px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold text-white tabular-nums">{song.bpm ?? "--"}</span>
          <span className="font-mono text-[10px] tracking-widest text-white/40 uppercase">bpm</span>
        </div>

        <div className="h-9 w-px bg-white/8" />

        <span className="rounded-md border border-white/6 bg-black/30 px-2.5 py-1.5 font-mono text-xs tabular-nums text-white/70">
          {formatTime(player.currentTime)} <span className="text-white/25">/</span> {formatTime(player.duration)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{song.title}</p>
          <p className="truncate text-xs text-white/45">{song.artist}</p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/6 bg-black/30 p-1.5 shadow-inner">
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
            className="rounded-lg bg-orange-500 text-black shadow-[0_0_16px_rgba(255,138,31,0.45)] hover:bg-orange-400"
            onClick={player.isPlaying ? player.pause : player.play}
            disabled={!player.isReady}
          >
            {player.isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
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

        <div className="flex min-w-40 flex-1 items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Tempo</span>
          <Slider
            className="flex-1"
            min={0.5}
            max={1.5}
            step={0.01}
            value={[player.tempo]}
            onValueChange={(value) => player.setTempo(Array.isArray(value) ? value[0] : value)}
          />
          <span className="w-10 text-right font-mono text-[10px] text-white/50">
            {Math.round(player.tempo * 100)}%
          </span>
        </div>
        <div className="flex min-w-40 flex-1 items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Pitch</span>
          <Slider
            className="flex-1"
            min={-12}
            max={12}
            step={1}
            value={[player.pitch]}
            onValueChange={(value) => player.setPitch(Array.isArray(value) ? value[0] : value)}
          />
          <span className="w-8 text-right font-mono text-[10px] text-white/50">
            {player.pitch > 0 ? `+${player.pitch}` : player.pitch}
          </span>
        </div>
      </div>

      {/* Song carousel */}
      {songs.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {songs.map((s, i) => {
            const active = s.id === song.id;
            return (
              <div key={s.id} className="flex shrink-0 items-center gap-1">
                <Link href={`/dashboard/songs/${s.id}`} className="group flex w-28 shrink-0 flex-col gap-1.5">
                  <div
                    className={`relative flex h-16 items-center justify-center overflow-hidden rounded-lg border bg-linear-to-br from-white/10 to-transparent ${
                      active ? "border-orange-400/50 shadow-[0_0_0_1px_rgba(255,138,31,0.3)]" : "border-white/8"
                    }`}
                  >
                    <Music2 className="size-5 text-white/25" strokeWidth={1.5} />
                    {active && (
                      <span className="absolute top-1 left-1 flex size-4 items-center justify-center rounded-full bg-orange-400 text-black">
                        <Play className="size-2.5 fill-current" />
                      </span>
                    )}
                  </div>
                  <p
                    className={`truncate text-[11px] font-medium ${active ? "text-orange-400" : "text-white/60 group-hover:text-white"}`}
                  >
                    {s.title} {s.musical_key ? <span className="text-white/30">({s.musical_key})</span> : null}
                  </p>
                </Link>
                {i < songs.length - 1 && <ChevronRight className="size-3.5 shrink-0 text-white/15" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Arrangement: markers + main waveform */}
      <div className="rounded-2xl border border-white/6 bg-black/25">
        <div className="flex items-center gap-1 overflow-x-auto px-4 pt-3 pb-2">
          {player.markers.map((marker, i) => (
            <div key={marker.time} className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => player.seekTo(marker.time)}
                className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${MARKER_COLORS[i % MARKER_COLORS.length]}`}
              >
                {marker.label}
                <X
                  className="size-3 opacity-0 group-hover:opacity-70"
                  onClick={(e) => {
                    e.stopPropagation();
                    player.removeMarker(marker.time);
                  }}
                />
              </button>
              {i < player.markers.length - 1 && <ChevronRight className="size-3 shrink-0 text-white/15" />}
            </div>
          ))}
          <div className="flex shrink-0 items-center gap-1.5 pl-1">
            <input
              className="h-6 w-28 rounded-md border border-white/6 bg-black/20 px-2 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
              placeholder="Sección..."
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
            />
            <button
              onClick={() => {
                player.addMarker(markerLabel || `Marca ${player.markers.length + 1}`, player.currentTime);
                setMarkerLabel("");
              }}
              disabled={!player.isReady}
              className="flex size-6 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          {mainUrl && (
            <TrackWaveform
              url={mainUrl}
              currentTime={player.currentTime}
              duration={player.duration}
              isMuted={false}
              onSeek={player.seekTo}
              height={72}
            />
          )}
          {player.duration > 0 && (
            <div className="relative mt-1 h-2">
              {player.markers.map((marker, i) => (
                <span
                  key={marker.time}
                  className={`absolute top-0 size-1.5 -translate-x-1/2 rounded-full ${MARKER_COLORS[i % MARKER_COLORS.length].split(" ")[1].replace("/15", "")}`}
                  style={{ left: `${(marker.time / player.duration) * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Channel rack + master */}
      <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tracks.map((track) => {
            const level = player.trackLevels.get(track.id) ?? 0;
            const audible = anySolo ? track.is_solo : !track.is_muted;

            return (
              <div
                key={track.id}
                className={`flex w-20 shrink-0 flex-col items-center gap-2.5 rounded-xl border p-2.5 transition-colors ${
                  audible && player.isPlaying
                    ? "border-orange-400/20 bg-linear-to-b from-orange-400/4 to-white/2"
                    : "border-white/6 bg-white/[0.015]"
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMix(track.id, { is_solo: !track.is_solo })}
                    className={`flex size-6 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-all ${
                      track.is_solo
                        ? "border-amber-400 bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                        : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/70"
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={() => setMix(track.id, { is_muted: !track.is_muted })}
                    className={`flex size-6 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-all ${
                      track.is_muted
                        ? "border-red-500 bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/70"
                    }`}
                  >
                    M
                  </button>
                </div>

                <div className="flex h-36 items-stretch gap-2">
                  <VerticalMeter level={level} active={audible} />
                  <div className="relative h-full">
                    <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 h-px bg-emerald-400/40" />
                    <Slider
                      orientation="vertical"
                      className="h-full"
                      min={0}
                      max={2}
                      step={0.01}
                      value={[track.volume]}
                      onValueChange={(value) =>
                        setMix(track.id, { volume: Array.isArray(value) ? value[0] : value })
                      }
                    />
                  </div>
                </div>

                {editingTrackId === track.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(track)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(track);
                      if (e.key === "Escape") setEditingTrackId(null);
                    }}
                    className="w-full rounded border border-orange-400/40 bg-black/40 px-1 text-center text-[10px] text-white outline-none"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingTrackId(track.id);
                      setEditingName(track.name);
                    }}
                    className={`w-full truncate text-center text-[10px] font-medium transition-colors ${
                      track.is_muted ? "text-white/25 line-through" : "text-white/70 hover:text-white"
                    }`}
                    title={`${track.name} · click para renombrar`}
                  >
                    {track.name}
                  </button>
                )}
              </div>
            );
          })}

          <div className="mx-1 w-px shrink-0 bg-white/8" />

          <div className="flex w-20 shrink-0 flex-col items-center gap-2.5 rounded-xl border border-white/8 bg-white/2 p-2.5">
            <span className="font-mono text-[10px] font-bold text-white/50">M</span>
            <div className="flex h-36 items-stretch gap-2">
              <VerticalMeter level={player.masterLevel} active={player.isPlaying} />
              <div className="relative h-full">
                <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 h-px bg-emerald-400/40" />
                <Slider
                  orientation="vertical"
                  className="h-full"
                  min={0}
                  max={1.5}
                  step={0.01}
                  value={[player.masterVolume]}
                  onValueChange={(value) => player.setMasterVolume(Array.isArray(value) ? value[0] : value)}
                />
              </div>
            </div>
            <span className="w-full truncate text-center text-[10px] font-medium text-white/70">Master</span>
          </div>
        </div>
      </div>
    </div>
  );
}
