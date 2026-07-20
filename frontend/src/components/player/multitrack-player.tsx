"use client";

import { useEffect, useMemo, useState } from "react";
import { TransportBar, type PlayerPanel } from "@/components/player/transport-bar";
import { SongCarousel } from "@/components/player/song-carousel";
import { Timeline } from "@/components/player/timeline";
import { SequenceEditor } from "@/components/player/sequence-editor";
import { BottomBar } from "@/components/player/bottom-bar";
import { ChannelStrip } from "@/components/player/channel-strip";
import { MetronomeStrip } from "@/components/player/metronome-strip";
import { MasterStrip } from "@/components/player/master-strip";
import { useMultitrackPlayer, type ISequenceSpan } from "@/hooks/use-multitrack-player";
import { useMarkers } from "@/hooks/use-markers";
import { useSequence } from "@/hooks/use-sequence";
import { useUpdateSong } from "@/hooks/use-songs";
import { useQueueStore } from "@/store/queue-store";
import type { ITrack, TrackType } from "@/hooks/use-tracks";
import type { ISong } from "@/hooks/use-songs";

const CHANNEL_COLORS = ["#ff8a1f", "#38bdf8", "#34d399", "#a78bfa", "#f472b6", "#facc15", "#fb7185", "#22d3ee"];

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
    track_type: TrackType;
    is_hidden: boolean;
    duration_seconds: number | null;
  }) => void;
}

export function MultitrackPlayer({ song, songs, tracks, onUpdateTrack }: IMultitrackPlayerProps) {
  const { data: markers } = useMarkers(song.id);
  const { data: sequenceItems } = useSequence(song.id);
  const updateSong = useUpdateSong(song.id);
  const setActiveSong = useQueueStore((s) => s.setActiveSong);

  const sequenceSpans: ISequenceSpan[] = useMemo(() => {
    const markerById = new Map((markers ?? []).map((m) => [m.id, m]));
    const spans: ISequenceSpan[] = [];
    for (const item of sequenceItems ?? []) {
      const marker = markerById.get(item.marker_id);
      if (!marker) continue;
      spans.push({
        itemId: item.id,
        markerId: marker.id,
        start: marker.position_seconds,
        end: marker.end_time_seconds ?? Infinity,
      });
    }
    return spans;
  }, [markers, sequenceItems]);

  const player = useMultitrackPlayer(tracks, sequenceSpans);

  const [panel, setPanel] = useState<PlayerPanel>("mixer");
  const [armedTracks, setArmedTracks] = useState<Set<number>>(new Set());
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setActiveSong(song.id);
  }, [song.id, setActiveSong]);

  useEffect(() => {
    player.setBaseBpm(song.bpm ?? 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.bpm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        player.toggleGlobalFade();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      track_type: updated.track_type,
      is_hidden: updated.is_hidden,
      duration_seconds: updated.duration_seconds,
    });
  };

  const buildSongPayload = (patch: Partial<ISong>) => {
    const updated = { ...song, ...patch };
    updateSong.mutate({
      title: updated.title,
      artist: updated.artist,
      bpm: updated.bpm,
      musical_key: updated.musical_key,
      time_signature: updated.time_signature,
      duration_seconds: updated.duration_seconds,
      language: updated.language,
      notes: updated.notes,
      tags: updated.tags,
      song_date: updated.song_date,
      cover_image_url: updated.cover_image_url,
      color: updated.color,
      is_favorite: updated.is_favorite,
      category_id: updated.category_id,
      album_id: updated.album_id,
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
      <TransportBar
        title={song.title}
        artist={song.artist}
        bpm={song.bpm}
        timeSignature={song.time_signature}
        currentTime={player.currentTime}
        duration={player.duration}
        isPlaying={player.isPlaying}
        isReady={player.isReady}
        loop={player.loop}
        isLoading={player.isLoading}
        loadError={player.loadError}
        loadedTracks={player.loadedTracks}
        totalTracks={player.totalTracks}
        panel={panel}
        onPanelChange={setPanel}
        editMode={editMode}
        onToggleEditMode={() => setEditMode((v) => !v)}
        onPlayPause={player.isPlaying ? player.pause : player.play}
        onStop={player.stop}
        onRewind={() => player.seekTo(0)}
        onToggleLoop={() => player.setLoop(!player.loop)}
      />

      <SongCarousel activeSongId={song.id} allSongs={songs} />

      <Timeline
        songId={song.id}
        mainUrl={mainUrl}
        markers={markers}
        sequence={sequenceSpans}
        currentSequenceIndex={player.currentSequenceIndex}
        pendingSequenceIndex={player.pendingSequenceIndex}
        currentTime={player.currentTime}
        duration={player.duration}
        loop={player.loop}
        onSeek={player.seekTo}
        onSeekToSequenceIndex={player.seekToSequenceIndex}
        onSetLoop={player.setLoop}
        editMode={editMode}
      />

      {panel === "sequence" ? (
        <SequenceEditor
          songId={song.id}
          markers={markers}
          sequenceItems={sequenceItems}
          currentSequenceIndex={player.currentSequenceIndex}
          onSeekToIndex={player.seekToSequenceIndex}
        />
      ) : (
        <div className="rounded-2xl border border-white/6 bg-black/20 p-3">
          <div className="flex w-full flex-wrap gap-2">
            <MetronomeStrip
              color="#64748b"
              volume={player.metronomeVolume}
              level={player.metronomeLevel}
              db={player.metronomeDb}
              clipping={player.metronomeClipping}
              isOn={player.metronomeOn}
              isPlaying={player.isPlaying}
              tempo={player.tempo}
              sound={player.metronomeSound}
              onToggleOn={() => player.setMetronomeOn(!player.metronomeOn)}
              onVolumeChange={player.setMetronomeVolume}
              onTempoChange={player.setTempo}
              onSoundChange={player.setMetronomeSound}
            />

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

      <BottomBar
        metronomeOn={player.metronomeOn}
        onToggleMetronome={() => player.setMetronomeOn(!player.metronomeOn)}
        bpm={song.bpm}
        tempo={player.tempo}
        onTempoChange={player.setTempo}
        musicalKey={song.musical_key ?? ""}
        onKeyChange={(value) => buildSongPayload({ musical_key: value })}
        transpose={player.pitch}
        onTransposeChange={player.setPitch}
        timeSignature={song.time_signature}
        onTimeSignatureChange={(value) => buildSongPayload({ time_signature: value })}
        masterVolume={player.masterVolume}
        onMasterVolumeChange={player.setMasterVolume}
      />
    </div>
  );
}
