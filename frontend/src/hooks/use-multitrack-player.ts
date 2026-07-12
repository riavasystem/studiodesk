import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetchBlob } from "@/lib/api-client";
import { MultitrackEngine } from "@/lib/multitrack-engine";
import type { ITrack } from "@/hooks/use-tracks";

export interface IMarker {
  label: string;
  time: number;
}

export function useMultitrackPlayer(tracks: ITrack[] | undefined) {
  const engineRef = useRef<MultitrackEngine | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoopState] = useState(false);
  const [tempo, setTempoState] = useState(1);
  const [pitch, setPitchState] = useState(0);
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [trackUrls, setTrackUrls] = useState<Map<number, string>>(new Map());
  const [trackLevels, setTrackLevels] = useState<Map<number, number>>(new Map());

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

    (async () => {
      const blobs = await Promise.all(tracks.map((t) => apiFetchBlob(`/storage/${t.file_path}`)));
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
          isMuted: t.is_muted,
          isSolo: t.is_solo,
        })),
      );
      if (cancelled) return;

      engine.setTempo(tempo);
      engine.setPitch(pitch);
      setDuration(engine.duration);
      setIsReady(true);
      setIsLoading(false);
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
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const engine = engineRef.current;
      if (engine) {
        setCurrentTime(engine.currentTime);
        setIsPlaying(engine.isPlaying);
        setTrackLevels(
          new Map(trackIdListRef.current.map((id) => [id, engine.getTrackLevel(id)])),
        );
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

  const setLoop = useCallback(
    (value: boolean) => {
      setLoopState(value);
      engineRef.current?.setLoop(value);
    },
    [],
  );

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

  const setTrackMixState = useCallback((mixTracks: { id: number; isMuted: boolean; isSolo: boolean }[]) => {
    engineRef.current?.setTrackMixState(mixTracks);
  }, []);

  const addMarker = useCallback((label: string, time: number) => {
    setMarkers((prev) => [...prev, { label, time }].sort((a, b) => a.time - b.time));
  }, []);

  const removeMarker = useCallback((time: number) => {
    setMarkers((prev) => prev.filter((m) => m.time !== time));
  }, []);

  return {
    isReady,
    isLoading,
    isPlaying,
    currentTime,
    duration,
    loop,
    tempo,
    pitch,
    markers,
    trackUrls,
    trackLevels,
    play,
    pause,
    stop,
    seekTo,
    setLoop,
    setTempo,
    setPitch,
    setTrackVolume,
    setTrackMixState,
    addMarker,
    removeMarker,
  };
}
