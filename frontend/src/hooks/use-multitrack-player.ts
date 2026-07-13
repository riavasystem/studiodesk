import { useCallback, useEffect, useRef, useState } from "react";
import { buildAuthenticatedStorageUrl } from "@/lib/api-client";
import { MultitrackEngine } from "@/lib/multitrack-engine";
import type { ITrack } from "@/hooks/use-tracks";

export function useMultitrackPlayer(tracks: ITrack[] | undefined) {
  const engineRef = useRef<MultitrackEngine | null>(null);
  const rafRef = useRef<number | null>(null);

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
        setCurrentTime(engine.currentTime);
        setIsPlaying(engine.isPlaying);

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
    setMasterVolumeState(value);
    engineRef.current?.setMasterVolume(value);
  }, []);

  const setMetronomeOn = useCallback((value: boolean) => {
    setMetronomeOnState(value);
    engineRef.current?.setMetronome(value);
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
