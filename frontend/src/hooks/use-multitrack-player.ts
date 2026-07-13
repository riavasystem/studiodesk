import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetchBlob } from "@/lib/api-client";
import { MultitrackEngine } from "@/lib/multitrack-engine";
import type { ITrack } from "@/hooks/use-tracks";

const MAX_CONCURRENT_DOWNLOADS = 4;
const MAX_ATTEMPTS_PER_TRACK = 3;

async function fetchBlobsWithLimit(
  paths: string[],
  signal: AbortSignal,
  onEachDone: () => void,
): Promise<Blob[]> {
  const results: Blob[] = new Array(paths.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= paths.length) return;

      let lastError: unknown;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_TRACK; attempt++) {
        try {
          results[i] = await apiFetchBlob(paths[i], signal);
          lastError = null;
          break;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          lastError = err;
        }
      }
      if (lastError) throw lastError;
      onEachDone();
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_DOWNLOADS, paths.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function useMultitrackPlayer(tracks: ITrack[] | undefined) {
  const engineRef = useRef<MultitrackEngine | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
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
    const abortController = new AbortController();
    setIsLoading(true);
    setIsReady(false);
    setLoadError(null);
    setLoadedTracks(0);
    setTotalTracks(tracks.length);

    (async () => {
      try {
        const blobs = await fetchBlobsWithLimit(
          tracks.map((t) => `/storage/${t.file_path}`),
          abortController.signal,
          () => {
            if (!cancelled) setLoadedTracks((count) => count + 1);
          },
        );
        if (cancelled) return;

        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        const urls = blobs.map((blob) => URL.createObjectURL(blob));
        objectUrlsRef.current = urls;
        setTrackUrls(new Map(tracks.map((t, i) => [t.id, urls[i]])));

        await engine.loadTracks(
          tracks.map((t, i) => ({
            id: t.id,
            url: urls[i],
            volume: t.volume,
            pan: t.pan,
            isMuted: t.is_muted,
            isSolo: t.is_solo,
            isPhaseInverted: t.is_phase_inverted,
          })),
        );
        if (cancelled) return;

        engine.setTempo(tempo);
        engine.setPitch(pitch);
        setDuration(engine.duration);
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar las pistas");
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIds]);

  useEffect(() => {
    const engine = engineRef.current;
    return () => {
      engine?.dispose();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const engine = engineRef.current;
      if (engine) {
        setCurrentTime(engine.currentTime);
        setIsPlaying(engine.isPlaying);
        setTrackLevels(new Map(trackIdListRef.current.map((id) => [id, engine.getTrackLevel(id)])));
        setTrackDb(new Map(trackIdListRef.current.map((id) => [id, engine.getTrackDb(id)])));
        setTrackClipping(new Map(trackIdListRef.current.map((id) => [id, engine.isTrackClipping(id)])));
        setMasterLevel(engine.getMasterLevel());
        setMasterDb(engine.getMasterDb());
        setMasterClipping(engine.isMasterClipping());
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
