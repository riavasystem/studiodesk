"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Music2, Pause, Play, Plus, Repeat, Square, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TrackWaveform } from "@/components/player/track-waveform";
import { ChannelStrip } from "@/components/player/channel-strip";
import { MasterStrip } from "@/components/player/master-strip";
import { PlayerSidebar, type PlayerPanel } from "@/components/player/player-sidebar";
import { LyricsPanel } from "@/components/player/lyrics-panel";
import { useMultitrackPlayer } from "@/hooks/use-multitrack-player";
import { useCreateMarker, useDeleteMarker, useMarkers, MARKER_TYPE_COLORS, type MarkerType } from "@/hooks/use-markers";
import { useLyrics } from "@/hooks/use-lyrics";
import type { ITrack } from "@/hooks/use-tracks";
import type { ISong } from "@/hooks/use-songs";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const CHANNEL_COLORS = ["#ff8a1f", "#38bdf8", "#34d399", "#a78bfa", "#f472b6", "#facc15", "#fb7185", "#22d3ee"];

const MARKER_TYPE_OPTIONS: MarkerType[] = [
  "intro",
  "verse",
  "prechorus",
  "chorus",
  "bridge",
  "solo",
  "outro",
  "ending",
  "cue",
  "click",
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
    pan: number;
    is_muted: boolean;
    is_solo: boolean;
    is_phase_inverted: boolean;
    color: string;
  }) => void;
}

export function MultitrackPlayer({ song, songs, tracks, onUpdateTrack }: IMultitrackPlayerProps) {
  const player = useMultitrackPlayer(tracks);
  const { data: markers } = useMarkers(song.id);
  const createMarker = useCreateMarker(song.id);
  const deleteMarker = useDeleteMarker(song.id);
  const { data: lyrics } = useLyrics(song.id);

  const [markerLabel, setMarkerLabel] = useState("");
  const [markerType, setMarkerType] = useState<MarkerType>("cue");
  const [zoom, setZoom] = useState(0);
  const [panel, setPanel] = useState<PlayerPanel>("mixer");
  const [armedTracks, setArmedTracks] = useState<Set<number>>(new Set());
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  const buildPayload = (track: ITrack, patch: Partial<ITrack>) => {
    const updated = { ...track, ...patch };
    onUpdateTrack({
      id: updated.id,
      name: updated.name,
      file_path: updated.file_path,
      order_index: updated.order_index,
      volume: updated.volume,
      pan: updated.pan,
      is_muted: updated.is_muted,
      is_solo: updated.is_solo,
      is_phase_inverted: updated.is_phase_inverted,
      color: updated.color,
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
    buildPayload(target, patch);
  };

  const toggleArm = (id: number) => {
    setArmedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
        {song.musical_key && (
          <span className="rounded-md border border-white/6 bg-black/30 px-2 py-1 font-mono text-xs text-white/60">
            Key {song.musical_key}
          </span>
        )}

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
            title="Loop infinito"
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
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto px-4 pt-3 pb-2">
          {markers?.map((marker) => (
            <button
              key={marker.id}
              onClick={() => player.seekTo(marker.position_seconds)}
              className="group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                borderColor: `${marker.color}66`,
                backgroundColor: `${marker.color}22`,
                color: marker.color,
              }}
            >
              {marker.label}
              <X
                className="size-3 opacity-0 group-hover:opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMarker.mutate(marker.id, { onError: () => toast.error("No se pudo borrar el marcador") });
                }}
              />
            </button>
          ))}
          <div className="flex shrink-0 items-center gap-1.5 pl-1">
            <select
              value={markerType}
              onChange={(e) => setMarkerType(e.target.value as MarkerType)}
              className="h-6 rounded-md border border-white/6 bg-black/20 px-1 text-[11px] text-white outline-none"
            >
              {MARKER_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type} className="bg-black">
                  {type}
                </option>
              ))}
            </select>
            <input
              className="h-6 w-28 rounded-md border border-white/6 bg-black/20 px-2 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-orange-400/40"
              placeholder="Nombre..."
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
            />
            <button
              onClick={() => {
                createMarker.mutate(
                  {
                    label: markerLabel || markerType,
                    marker_type: markerType,
                    color: MARKER_TYPE_COLORS[markerType],
                    position_seconds: player.currentTime,
                  },
                  { onError: () => toast.error("No se pudo crear el marcador") },
                );
                setMarkerLabel("");
              }}
              disabled={!player.isReady}
              className="flex size-6 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              onClick={() => setLoopA(player.currentTime)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] ${loopA !== null ? "border-cyan-400/50 text-cyan-300" : "border-white/10 text-white/40"}`}
            >
              A {loopA !== null ? formatTime(loopA) : ""}
            </button>
            <button
              onClick={() => setLoopB(player.currentTime)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] ${loopB !== null ? "border-cyan-400/50 text-cyan-300" : "border-white/10 text-white/40"}`}
            >
              B {loopB !== null ? formatTime(loopB) : ""}
            </button>
            <button
              onClick={() => {
                if (loopA === null || loopB === null) return;
                player.setLoop(!player.loop, Math.min(loopA, loopB), Math.max(loopA, loopB));
              }}
              disabled={loopA === null || loopB === null}
              className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-mono text-[10px] text-cyan-300 disabled:opacity-30"
            >
              Loop A-B
            </button>
            <div className="flex items-center gap-1.5">
              <ZoomIn className="size-3.5 text-white/30" />
              <Slider
                className="w-24"
                min={0}
                max={200}
                step={5}
                value={[zoom]}
                onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-4">
          {mainUrl && (
            <TrackWaveform
              url={mainUrl}
              currentTime={player.currentTime}
              duration={player.duration}
              isMuted={false}
              onSeek={player.seekTo}
              height={72}
              zoom={zoom}
            />
          )}
        </div>
      </div>

      {/* Sidebar + panel */}
      <div className="flex items-start gap-3">
        <PlayerSidebar
          panel={panel}
          onPanelChange={setPanel}
          metronomeOn={player.metronomeOn}
          onToggleMetronome={() => player.setMetronomeOn(!player.metronomeOn)}
        />

        {panel === "lyrics" ? (
          <div className="flex-1">
            <LyricsPanel lines={lyrics ?? []} currentTime={player.currentTime} onSeek={player.seekTo} />
          </div>
        ) : (
          <div className="flex-1 rounded-2xl border border-white/6 bg-black/20 p-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tracks.map((track, i) => {
                const level = player.trackLevels.get(track.id) ?? 0;
                const audible = anySolo ? track.is_solo : !track.is_muted;

                return (
                  <ChannelStrip
                    key={track.id}
                    track={track}
                    color={track.color !== "#ff8a1f" ? track.color : CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                    level={level}
                    db={player.trackDb.get(track.id) ?? -Infinity}
                    clipping={player.trackClipping.get(track.id) ?? false}
                    audible={audible}
                    isPlaying={player.isPlaying}
                    armed={armedTracks.has(track.id)}
                    onToggleArm={() => toggleArm(track.id)}
                    onToggleMute={() => setMix(track.id, { is_muted: !track.is_muted })}
                    onToggleSolo={() => setMix(track.id, { is_solo: !track.is_solo })}
                    onVolumeChange={(value) => setMix(track.id, { volume: value })}
                    onPanChange={(value) => {
                      player.setTrackPan(track.id, value);
                      buildPayload(track, { pan: value });
                    }}
                    onPhaseToggle={() => {
                      const inverted = !track.is_phase_inverted;
                      player.setTrackPhaseInverted(track.id, inverted);
                      buildPayload(track, { is_phase_inverted: inverted });
                    }}
                    onEQChange={(band) => player.setTrackEQ(track.id, band)}
                    onCompressorToggle={(enabled) => player.setTrackCompressor(track.id, { enabled })}
                    onReverbSendChange={(value) => player.setTrackReverbSend(track.id, value)}
                    onRename={(name) => buildPayload(track, { name })}
                  />
                );
              })}

              <div className="mx-1 w-px shrink-0 bg-white/8" />

              <MasterStrip
                volume={player.masterVolume}
                level={player.masterLevel}
                db={player.masterDb}
                clipping={player.masterClipping}
                isPlaying={player.isPlaying}
                onVolumeChange={player.setMasterVolume}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
