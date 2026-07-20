import { useCallback, useEffect, useRef, useState } from "react";
import { buildAuthenticatedStorageUrl } from "@/lib/api-client";
import { MultitrackEngine, type MetronomeSoundId, type MetronomeSubdivision } from "@/lib/multitrack-engine";
import type { ITrack } from "@/hooks/use-tracks";

export interface ISequenceSpan {
  itemId: number;
  markerId: number;
  label: string;
  start: number;
  end: number;
}

export function useMultitrackPlayer(tracks: ITrack[] | undefined, sequence: ISequenceSpan[] = []) {
  const engineRef = useRef<MultitrackEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const sequenceRef = useRef<ISequenceSpan[]>([]);
  sequenceRef.current = sequence;
  const lastCheckedTimeRef = useRef(0);
  // The sequence item the transport is currently "inside", tracked by its
  // stable itemId (not array index) so edits elsewhere in the sequence —
  // deleting or inserting a section before this one — can't leave this
  // pointing at the wrong slot after the array shifts.
  const activeItemIdRef = useRef<number | null>(null);

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
  // Starts active: the click should be audible the moment a song is ready
  // to play, not require an extra manual step every time.
  const [metronomeOn, setMetronomeOnState] = useState(true);
  const metronomeOnRef = useRef(true);
  const padOnRef = useRef(true);
  const [trackUrls, setTrackUrls] = useState<Map<number, string>>(new Map());
  const [trackLevels, setTrackLevels] = useState<Map<number, number>>(new Map());
  const [trackVolumeDisplay, setTrackVolumeDisplay] = useState<Map<number, number>>(new Map());
  const [trackDb, setTrackDb] = useState<Map<number, number>>(new Map());
  const [trackClipping, setTrackClipping] = useState<Map<number, boolean>>(new Map());
  const [masterVolume, setMasterVolumeState] = useState(1);
  const [masterLevel, setMasterLevel] = useState(0);
  const [masterDb, setMasterDb] = useState(-Infinity);
  const [masterClipping, setMasterClipping] = useState(false);
  const [isFaded, setIsFaded] = useState(false);
  const masterVolumeRef = useRef(1);
  const preFadeVolumeRef = useRef(1);
  const [metronomeVolume, setMetronomeVolumeState] = useState(1);
  const [metronomeVolumeDisplay, setMetronomeVolumeDisplay] = useState(1);
  const [metronomeBpm, setMetronomeBpmState] = useState(120);
  const [metronomeSound, setMetronomeSoundState] = useState<MetronomeSoundId>("clock");
  const [metronomeSubdivision, setMetronomeSubdivisionState] = useState<MetronomeSubdivision>("1/4");
  const [metronomeLevel, setMetronomeLevel] = useState(0);
  const [metronomeDb, setMetronomeDb] = useState(-Infinity);
  const [metronomeClipping, setMetronomeClipping] = useState(false);
  // Starts active, same as the click — the whole point of an "always
  // running" ambient bed is that it's on unless the user turns it off.
  const [padOn, setPadOnState] = useState(true);
  const [padVolume, setPadVolumeState] = useState(0.6);
  const [padVolumeDisplay, setPadVolumeDisplay] = useState(0.6);
  const [padLevel, setPadLevel] = useState(0);
  const [padDb, setPadDb] = useState(-Infinity);
  const [padClipping, setPadClipping] = useState(false);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState<number | null>(null);
  const [pendingSequenceIndex, setPendingSequenceIndex] = useState<number | null>(null);
  // True once the whole sequence has finished playing through — lets the
  // caller auto-advance to the next song in the queue, or offer to save the
  // queue as a playlist once there's nothing left to advance to.
  const [sequenceEnded, setSequenceEnded] = useState(false);
  const pendingSequenceIndexRef = useRef<number | null>(null);
  pendingSequenceIndexRef.current = pendingSequenceIndex;

  // Voice guide (GUIA): announces each section's name as it starts, using
  // the browser's built-in speech synthesis — no server-side TTS, so no
  // extra infra/cost, in line with "no paid AI services in v1".
  // Starts active too, same reasoning as the click/pad.
  const [guideOn, setGuideOnState] = useState(true);
  const guideOnRef = useRef(true);
  const [guideVolume, setGuideVolumeState] = useState(1);
  const guideVolumeRef = useRef(1);
  const wasPlayingRef = useRef(false);
  const guideVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      const spanish = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
      // Voice names aren't consistently gendered across browsers/OSes, so we
      // match against known female Spanish voice names first; anything not
      // matched falls back to the first Spanish voice, then any voice at all.
      const femaleNames = ["mónica", "monica", "paulina", "helena", "lucia", "lucía", "elena", "laura", "sabina", "female"];
      const female = spanish.find((v) => femaleNames.some((name) => v.name.toLowerCase().includes(name)));
      guideVoiceRef.current = female ?? spanish[0] ?? voices[0] ?? null;
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const announceSection = useCallback((label: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(label);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    // A slightly higher pitch biases toward a lighter/feminine timbre when no
    // explicit Spanish female voice was found on this browser/OS.
    utterance.pitch = 1.15;
    utterance.volume = guideVolumeRef.current;
    if (guideVoiceRef.current) utterance.voice = guideVoiceRef.current;
    window.speechSynthesis.speak(utterance);
  }, []);

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
    setSequenceEnded(false);

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
        // dispose() (called at the start of loadTracks) cancels every
        // Transport-scheduled event, which silently kills the click/pad loop
        // — restart them here so a song swap doesn't drop the click that's
        // supposed to always be running by default.
        engine.setMetronome(metronomeOnRef.current);
        engine.setPadOn(padOnRef.current);
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
        const previousActiveItemId = activeItemIdRef.current;

        if (seq.length === 0) {
          activeItemIdRef.current = null;
        } else {
          // A jump bigger than a normal frame step (rewind, loop wrap, an
          // external seek) means `time` may no longer belong to the span we
          // were tracking — resync by locating it fresh. Natural forward
          // playback never needs this: it advances by a tiny amount per tick.
          const isExternalJump = Math.abs(time - prevTime) > 0.5;

          // Re-resolve by itemId (not a raw index) so edits elsewhere in the
          // sequence — e.g. deleting an earlier section — can't leave this
          // pointing at a stale array position after the array shifts.
          let idx = activeItemIdRef.current !== null ? seq.findIndex((s) => s.itemId === activeItemIdRef.current) : -1;
          if (idx === -1 || isExternalJump) {
            idx = seq.findIndex((s) => time >= s.start && time < s.end);
          }

          if (idx === -1) {
            // `time` isn't covered by any sequence span — most likely the
            // section that used to occupy this stretch was just deleted.
            // Skip forward to whatever comes next instead of continuing to
            // play that now-untracked raw audio.
            activeItemIdRef.current = null;
            setCurrentSequenceIndex(null);
            if (engine.isPlaying) {
              const nextIdx = seq.findIndex((s) => s.start > time);
              if (nextIdx !== -1) {
                const nextSpan = seq[nextIdx];
                engine.seekTo(nextSpan.start);
                lastCheckedTimeRef.current = nextSpan.start;
                activeItemIdRef.current = nextSpan.itemId;
                setCurrentSequenceIndex(nextIdx);
              } else {
                engine.pause();
              }
            }
          } else {
            activeItemIdRef.current = seq[idx].itemId;
            setCurrentSequenceIndex(idx);

            if (engine.isPlaying && time >= seq[idx].end) {
              const pending = pendingSequenceIndexRef.current;
              const nextIndex = pending !== null ? pending : idx + 1;
              if (nextIndex < seq.length) {
                const nextSpan = seq[nextIndex];
                engine.seekTo(nextSpan.start);
                lastCheckedTimeRef.current = nextSpan.start;
                activeItemIdRef.current = nextSpan.itemId;
                setCurrentSequenceIndex(nextIndex);
                setPendingSequenceIndex(null);
              } else {
                engine.pause();
                setSequenceEnded(true);
              }
            }
          }
        }

        // Voice guide: announce a section's name once, right as it becomes
        // active — either because playback just crossed into it, or because
        // Play was just pressed on an already-resolved span (a plain itemId
        // comparison would miss that second case, since nothing "changed").
        const nowPlaying = engine.isPlaying;
        const justStartedPlaying = nowPlaying && !wasPlayingRef.current;
        wasPlayingRef.current = nowPlaying;
        if (
          nowPlaying &&
          guideOnRef.current &&
          activeItemIdRef.current !== null &&
          (activeItemIdRef.current !== previousActiveItemId || justStartedPlaying)
        ) {
          const activeSpan = seq.find((s) => s.itemId === activeItemIdRef.current);
          if (activeSpan) announceSection(activeSpan.label);
        }

        // Meters are throttled: re-rendering every mixer channel at 60fps makes
        // the whole console feel unresponsive to clicks/drags/typing once a song
        // has many tracks. ~15fps is still visually smooth for VU meters.
        frameCount++;
        if (frameCount % 4 === 0) {
          setTrackLevels(new Map(trackIdListRef.current.map((id) => [id, engine.getTrackLevel(id)])));
          setTrackVolumeDisplay(new Map(trackIdListRef.current.map((id) => [id, engine.getTrackVolume(id)])));
          setTrackDb(new Map(trackIdListRef.current.map((id) => [id, engine.getTrackDb(id)])));
          setTrackClipping(new Map(trackIdListRef.current.map((id) => [id, engine.isTrackClipping(id)])));
          setMasterLevel(engine.getMasterLevel());
          setMasterDb(engine.getMasterDb());
          setMasterClipping(engine.isMasterClipping());
          setMetronomeLevel(engine.getMetronomeLevel());
          setMetronomeVolumeDisplay(engine.getMetronomeVolume());
          setMetronomeDb(engine.getMetronomeDb());
          setMetronomeClipping(engine.isMetronomeClipping());
          setPadLevel(engine.getPadLevel());
          setPadVolumeDisplay(engine.getPadVolume());
          setPadDb(engine.getPadDb());
          setPadClipping(engine.isPadClipping());
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const play = useCallback(() => {
    setSequenceEnded(false);
    engineRef.current?.play();
  }, []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const stop = useCallback(() => {
    engineRef.current?.stop();
    setCurrentTime(0);
    setSequenceEnded(false);
  }, []);
  const seekTo = useCallback((seconds: number) => {
    setSequenceEnded(false);
    engineRef.current?.seekTo(seconds);
  }, []);

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
    setSequenceEnded(false);
    if (engine.isPlaying) {
      // Deferred: the currently-playing section keeps going until it naturally
      // ends (handled in the tick loop above), then jumps here.
      setPendingSequenceIndex(index);
    } else {
      engine.seekTo(span.start);
      lastCheckedTimeRef.current = span.start;
      activeItemIdRef.current = span.itemId;
      setCurrentSequenceIndex(index);
    }
  }, []);

  const cancelPendingSequenceIndex = useCallback(() => setPendingSequenceIndex(null), []);

  const setMetronomeOn = useCallback((value: boolean) => {
    metronomeOnRef.current = value;
    setMetronomeOnState(value);
    engineRef.current?.setMetronome(value);
  }, []);

  const setMetronomeBpm = useCallback((bpm: number) => {
    setMetronomeBpmState(bpm);
    engineRef.current?.setMetronomeBpm(bpm);
  }, []);

  const setMetronomeVolume = useCallback((value: number) => {
    setMetronomeVolumeState(value);
    engineRef.current?.setMetronomeVolume(value);
  }, []);

  const setMetronomeSound = useCallback((id: MetronomeSoundId) => {
    setMetronomeSoundState(id);
    engineRef.current?.setMetronomeSound(id);
  }, []);

  const setMetronomeSubdivision = useCallback((subdivision: MetronomeSubdivision) => {
    setMetronomeSubdivisionState(subdivision);
    engineRef.current?.setMetronomeSubdivision(subdivision);
  }, []);

  const setPadOn = useCallback((value: boolean) => {
    padOnRef.current = value;
    setPadOnState(value);
    engineRef.current?.setPadOn(value);
  }, []);

  const setPadVolume = useCallback((value: number) => {
    setPadVolumeState(value);
    engineRef.current?.setPadVolume(value);
  }, []);

  const setGuideOn = useCallback((value: boolean) => {
    guideOnRef.current = value;
    setGuideOnState(value);
    if (!value && typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const setGuideVolume = useCallback((value: number) => {
    guideVolumeRef.current = value;
    setGuideVolumeState(value);
  }, []);

  const FADE_SECONDS = 1.2;

  const toggleGlobalFade = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsFaded((prev) => {
      if (!prev) {
        preFadeVolumeRef.current = masterVolumeRef.current;
        // Fades every track's own gain (visible on each channel's VU meter),
        // not just the master bus, so the mixer clearly shows volume dropping.
        engine.fadeTracksOut(FADE_SECONDS);
        return true;
      }
      engine.fadeTracksIn(FADE_SECONDS);
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
    trackVolumeDisplay,
    trackDb,
    trackClipping,
    masterVolume,
    masterLevel,
    masterDb,
    masterClipping,
    setMasterVolume,
    isFaded,
    toggleGlobalFade,
    metronomeBpm,
    setMetronomeBpm,
    metronomeVolume,
    metronomeVolumeDisplay,
    setMetronomeVolume,
    metronomeSound,
    setMetronomeSound,
    metronomeSubdivision,
    setMetronomeSubdivision,
    metronomeLevel,
    metronomeDb,
    metronomeClipping,
    padOn,
    setPadOn,
    padVolume,
    padVolumeDisplay,
    setPadVolume,
    padLevel,
    padDb,
    padClipping,
    guideOn,
    setGuideOn,
    guideVolume,
    setGuideVolume,
    currentSequenceIndex,
    pendingSequenceIndex,
    sequenceEnded,
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
