import { useCallback, useEffect, useRef, useState } from "react";
import { buildAuthenticatedStorageUrl } from "@/lib/api-client";
import { MultitrackEngine } from "@/lib/multitrack-engine";
import type { ITrack } from "@/hooks/use-tracks";

export interface ISequenceSpan {
  itemId: number;
  markerId: number;
  start: number;
  end: number;
}

export function useMultitrackPlayer(tracks: ITrack[] | undefined, sequence: ISequenceSpan[] = []) {
  const engineRef = useRef<MultitrackEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const sequenceRef = useRef<ISequenceSpan[]>([]);
  sequenceRef.current = sequence;
  const lastCheckedTimeRef = useRef(0);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedTracks, setLoadedTracks] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoopState] = useState(false);
  const [tempo, setTempoState] = useState(1);
  const [pitch, setPitchState] = useState(0);
  const [metronomeOn, setMetronomeOnState] = useState(false);
  const [trackUrls, setTrackUrls] = useState<Map<number, string>>(new Map());
  const [trackLevels, setTrackLevels] = useState<Map<number, number>>(new Map());
  const [trackDb, setTrackDb] = useState<Map<number, number>>(new Map());
  const [trackClipping, setTrackClipping] = useState<Map<number, boolean>>(new Map());
  const [masterVolume, setMasterVolumeState] = useState(1);
  const [masterLevel, setMasterLevel] = useState(0);
  const [masterDb, setMasterDb] = useState(-Infinity);
  const [masterClipping, setMasterClipping] = useState(false);
  const [isFaded, setIsFaded] = useState(false);
  const masterVolumeRef = useRef(1);
  const preFadeVolumeRef = useRef(1);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState<number | null>(null);
  const [pendingSequenceIndex, setPendingSequenceIndex] = useState<number | null>(null);
  const pendingSequenceIndexRef = useRef<number | null>(null);
  pendingSequenceIndexRef.current = pendingSequenceIndex;

  if (!engineRef.current) engineRef.current = new MultitrackEngine();

  const trackIds = (tracks ?? []).map((t) => t.id).join(",");
  const trackIdListRef = useRef<number[]>([]);
  trackIdListRef.current = (tracks ?? []).map((t) => t.id);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !tracks || tracks.length === 0) {
      setIsReady(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsReady(false);
    setLoadError(null);
    setLoadedTracks(0);
    setTotalTracks(tracks.length);

    const urls = new Map(tracks.map((t) => [t.id, buildAuthenticatedStorageUrl(t.file_path)]));
    setTrackUrls(urls);

    (async () => {
      try {
        await engine.loadTracks(
          tracks.map((t) => ({
            id: t.id,
            url: urls.get(t.id)!,
            volume: t.volume,
            pan: t.pan,
            isMuted: t.is_muted,
            isSolo: t.is_solo,
            isPhaseInverted: t.is_phase_inverted,
          })),
          () => {
            if (!cancelled) setLoadedTracks((count) => count + 1);
          },
        );
        if (cancelled) return;

        engine.setTempo(tempo);
        engine.setPitch(pitch);
        setDuration(engine.duration);
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar las pistas");
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIds]);

  useEffect(() => {
    const engine = engineRef.current;
    return () => {
      engine?.dispose();
    };
  }, []);

  useEffect(() => {
    let frameCount = 0;
    const tick = () => {
      const engine = engineRef.current;
      if (engine) {
        // currentTime drives the playhead/waveform sync, so it updates every frame.
        const time = engine.currentTime;
        setCurrentTime(time);
        setIsPlaying(engine.isPlaying);

        const seq = sequenceRef.current;
        const prevTime = lastCheckedTimeRef.current;
        lastCheckedTimeRef.current = time;

        if (seq.length > 0) {
          const activeIndex = seq.findIndex((s) => time >= s.start && time < s.end);
          if (activeIndex !== -1) setCurrentSequenceIndex(activeIndex);

          const active = activeIndex !== -1 ? seq[activeIndex] : null;
          // Crossing-detection (not a >= window) so this fires exactly once per
          // boundary regardless of frame timing, and never re-fires while paused.
          const crossedBoundary = active !== null && prevTime < active.end && time >= active.end;

          if (crossedBoundary && engine.isPlaying) {
            const pending = pendingSequenceIndexRef.current;
            const nextIndex = pending !== null ? pending : activeIndex + 1;
            if (nextIndex < seq.length) {
              const nextSpan = seq[nextIndex];
              engine.seekTo(nextSpan.start);
              lastCheckedTimeRef.current = nextSpan.start;
              setCurrentSequenceIndex(nextIndex);
              setPendingSequenceIndex(null);
            } else {
              engine.pause();
            }
          }
        }

        // Meters are throttled: re-rendering every mixer channel at 60fps makes
        // the whole console feel unresponsive to clicks/drags/typing once a song
        // has many tracks. ~15fps is still visually smooth for VU meters.
        frameCount++;
        if (frameCount % 4 === 0) {
          setTrackLevels(new Map(trackIdListRef.current.map((id) => [id, engine.getTrackLevel(id)])));
          setTrackDb(new Map(trackIdListRef.current.map((id) => [id, engine.getTrackDb(id)])));
          setTrackClipping(new Map(trackIdListRef.current.map((id) => [id, engine.isTrackClipping(id)])));
          setMasterLevel(engine.getMasterLevel());
          setMasterDb(engine.getMasterDb());
          setMasterClipping(engine.isMasterClipping());
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const stop = useCallback(() => {
    engineRef.current?.stop();
    setCurrentTime(0);
  }, []);
  const seekTo = useCallback((seconds: number) => engineRef.current?.seekTo(seconds), []);

  const setLoop = useCallback((value: boolean, start?: number, end?: number) => {
    setLoopState(value);
    engineRef.current?.setLoop(value, start, end);
  }, []);

  const setTempo = useCallback((value: number) => {
    setTempoState(value);
    engineRef.current?.setTempo(value);
  }, []);

  const setPitch = useCallback((value: number) => {
    setPitchState(value);
    engineRef.current?.setPitch(value);
  }, []);

  const setTrackVolume = useCallback((id: number, volume: number) => {
    engineRef.current?.setTrackVolume(id, volume);
  }, []);

  const setTrackPan = useCallback((id: number, pan: number) => {
    engineRef.current?.setTrackPan(id, pan);
  }, []);

  const setTrackPhaseInverted = useCallback((id: number, inverted: boolean) => {
    engineRef.current?.setTrackPhaseInverted(id, inverted);
  }, []);

  const setTrackEQ = useCallback((id: number, band: { low?: number; mid?: number; high?: number }) => {
    engineRef.current?.setTrackEQ(id, band);
  }, []);

  const setTrackCompressor = useCallback(
    (id: number, options: { enabled: boolean; threshold?: number; ratio?: number }) => {
      engineRef.current?.setTrackCompressor(id, options);
    },
    [],
  );

  const setTrackReverbSend = useCallback((id: number, level: number) => {
    engineRef.current?.setTrackReverbSend(id, level);
  }, []);

  const setTrackMixState = useCallback((mixTracks: { id: number; isMuted: boolean; isSolo: boolean }[]) => {
    engineRef.current?.setTrackMixState(mixTracks);
  }, []);

  const setMasterVolume = useCallback((value: number) => {
    masterVolumeRef.current = value;
    setMasterVolumeState(value);
    engineRef.current?.setMasterVolume(value);
  }, []);

  const seekToSequenceIndex = useCallback((index: number) => {
    const engine = engineRef.current;
    const span = sequenceRef.current[index];
    if (!engine || !span) return;
    if (engine.isPlaying) {
      // Deferred: the currently-playing section keeps going until it naturally
      // ends (handled in the tick loop above), then jumps here.
      setPendingSequenceIndex(index);
    } else {
      engine.seekTo(span.start);
      lastCheckedTimeRef.current = span.start;
      setCurrentSequenceIndex(index);
    }
  }, []);

  const cancelPendingSequenceIndex = useCallback(() => setPendingSequenceIndex(null), []);

  const setMetronomeOn = useCallback((value: boolean) => {
    setMetronomeOnState(value);
    engineRef.current?.setMetronome(value);
  }, []);

  const setBaseBpm = useCallback((bpm: number) => {
    engineRef.current?.setBaseBpm(bpm);
  }, []);

  const FADE_SECONDS = 1.2;

  const toggleGlobalFade = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsFaded((prev) => {
      if (!prev) {
        preFadeVolumeRef.current = masterVolumeRef.current;
        engine.fadeMasterTo(0, FADE_SECONDS);
        return true;
      }
      engine.fadeMasterTo(preFadeVolumeRef.current, FADE_SECONDS);
      return false;
    });
  }, []);

  return {
    isReady,
    isLoading,
    loadError,
    loadedTracks,
    totalTracks,
    isPlaying,
    currentTime,
    duration,
    loop,
    tempo,
    pitch,
    metronomeOn,
    setMetronomeOn,
    trackUrls,
    trackLevels,
    trackDb,
    trackClipping,
    masterVolume,
    masterLevel,
    masterDb,
    masterClipping,
    setMasterVolume,
    isFaded,
    toggleGlobalFade,
    setBaseBpm,
    currentSequenceIndex,
    pendingSequenceIndex,
    seekToSequenceIndex,
    cancelPendingSequenceIndex,
    play,
    pause,
    stop,
    seekTo,
    setLoop,
    setTempo,
    setPitch,
    setTrackVolume,
    setTrackPan,
    setTrackPhaseInverted,
    setTrackEQ,
    setTrackCompressor,
    setTrackReverbSend,
    setTrackMixState,
  };
}
