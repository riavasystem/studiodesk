import * as Tone from "tone";

export type MetronomeSoundId = "clock" | "beep" | "wood" | "hihat";

export const METRONOME_SOUND_OPTIONS: { id: MetronomeSoundId; label: string }[] = [
  { id: "clock", label: "Reloj" },
  { id: "beep", label: "Beep" },
  { id: "wood", label: "Madera" },
  { id: "hihat", label: "Hi-Hat" },
];

// How many clicks per beat: quarter notes (1 per beat), eighths (2 per
// beat) or sixteenths (4 per beat) — the BPM itself never changes, only how
// finely each beat gets subdivided.
export type MetronomeSubdivision = "1/4" | "1/8" | "1/16";

export const METRONOME_SUBDIVISION_OPTIONS: { id: MetronomeSubdivision; label: string; ticksPerBeat: number }[] = [
  { id: "1/4", label: "1/4", ticksPerBeat: 1 },
  { id: "1/8", label: "1/8", ticksPerBeat: 2 },
  { id: "1/16", label: "1/16", ticksPerBeat: 4 },
];

const TICKS_PER_BEAT: Record<MetronomeSubdivision, number> = {
  "1/4": 1,
  "1/8": 2,
  "1/16": 4,
};

interface ITrackNode {
  player: Tone.Player;
  gain: Tone.Gain;
  phaseGain: Tone.Gain;
  pitchShift: Tone.PitchShift;
  panner: Tone.Panner;
  eq: Tone.EQ3;
  compressor: Tone.Compressor;
  sendGain: Tone.Gain;
  meter: Tone.Meter;
  meterDb: Tone.Meter;
}

export interface ITrackLoadInput {
  id: number;
  url: string;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  isPhaseInverted: boolean;
}

export interface ITrackMixState {
  id: number;
  isMuted: boolean;
  isSolo: boolean;
}

const FADE_SECONDS = 0.05;
const CLIP_THRESHOLD_DB = -0.5;
const MAX_CONCURRENT_TRACK_LOADS = 4;

export class MultitrackEngine {
  private nodes = new Map<number, ITrackNode>();
  private loaded = false;
  private playbackRate = 1;
  // The click's own speed, entirely independent of `playbackRate` (the song's
  // overall playback speed) — changing one must never move the other.
  private metronomeBpm = 120;
  private metronomeSubdivision: MetronomeSubdivision = "1/4";

  private masterGain = new Tone.Gain(1);
  private limiter = new Tone.Limiter(-1);
  private masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });
  private masterMeterDb = new Tone.Meter({ normalRange: false, smoothing: 0.6 });
  private reverb = new Tone.Reverb({ decay: 2.2, wet: 1 });
  // Four selectable metronome voices, all pre-built and silently connected —
  // switching sounds is just picking which one gets triggered per tick.
  private metronomeSynthClock = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 16,
    resonance: 3500,
    octaves: 0.5,
  });
  private metronomeSynthBeep = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
  });
  private metronomeSynthWood = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
  });
  private metronomeSynthHihat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
  });
  private metronomeSoundId: MetronomeSoundId = "clock";
  private metronomeGain = new Tone.Gain(1);
  private metronomeMeter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });
  private metronomeMeterDb = new Tone.Meter({ normalRange: false, smoothing: 0.6 });
  private metronomeEventId: number | null = null;
  private metronomeBeatIndex = 0;
  private preFadeTrackVolumes = new Map<number, number>();
  // Remembered so resumeTracks() can restore correct per-track audibility
  // after finishSequence() force-mutes everything at the end of a song.
  private lastMixState: ITrackMixState[] = [];
  private metronomeVolumeValue = 1;

  // Ambient synth pad — a sustained chord re-triggered every few seconds
  // while enabled, giving a harmonic bed under the song. Deliberately soft:
  // low fixed note velocity, a gentle lowpass to shave off harsh overtones,
  // and a low default gain, so it reads as a faint cushion (like a very
  // softly played keyboard key) rather than something that competes with
  // or "interferes" with the actual tracks.
  private padSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 1.8, decay: 0.4, sustain: 0.45, release: 2.2 },
  });
  private padFilter = new Tone.Filter({ type: "lowpass", frequency: 1200, Q: 0.3 });
  private padGain = new Tone.Gain(0.28);
  private padMeter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });
  private padMeterDb = new Tone.Meter({ normalRange: false, smoothing: 0.6 });
  private padLoopId: number | null = null;
  private padOnFlag = false;
  private padSounding = false;
  private padVolumeValue = 0.28;
  private static readonly PAD_CHORD = ["C3", "E3", "G3", "B3"];
  private static readonly PAD_VELOCITY = 0.35;
  private static readonly PAD_LOOP_SECONDS = 5;

  constructor() {
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.masterMeter);
    this.limiter.connect(this.masterMeterDb);
    this.limiter.toDestination();
    this.reverb.connect(this.masterGain);
    this.metronomeSynthClock.connect(this.metronomeGain);
    this.metronomeSynthBeep.connect(this.metronomeGain);
    this.metronomeSynthWood.connect(this.metronomeGain);
    this.metronomeSynthHihat.connect(this.metronomeGain);
    this.metronomeGain.connect(this.masterGain);
    this.metronomeGain.connect(this.metronomeMeter);
    this.metronomeGain.connect(this.metronomeMeterDb);
    this.padSynth.connect(this.padFilter);
    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.masterGain);
    this.padGain.connect(this.padMeter);
    this.padGain.connect(this.padMeterDb);
    void this.reverb.generate();
  }

  setMetronomeSound(id: MetronomeSoundId) {
    this.metronomeSoundId = id;
  }

  private triggerMetronomeClick(time: number) {
    switch (this.metronomeSoundId) {
      case "clock": {
        // Alternating tick/tock pitch, like an old pendulum clock, instead
        // of a flat single-tone click.
        this.metronomeSynthClock.frequency.value = this.metronomeBeatIndex % 2 === 0 ? 1400 : 900;
        this.metronomeSynthClock.triggerAttackRelease("32n", time);
        break;
      }
      case "beep":
        this.metronomeSynthBeep.triggerAttackRelease("C6", "32n", time);
        break;
      case "wood":
        this.metronomeSynthWood.triggerAttackRelease("G5", "32n", time);
        break;
      case "hihat":
        this.metronomeSynthHihat.triggerAttackRelease("32n", time);
        break;
    }
    this.metronomeBeatIndex++;
  }

  /** Enables/disables the pad as a *preference* — it only actually produces
   * sound while the transport is running (see startPadSound/stopPadSound,
   * called from play()/pause()/stop()). Toggling this while paused must stay
   * silent; it should only take effect the next time playback starts. */
  setPadOn(enabled: boolean) {
    this.padOnFlag = enabled;
    if (enabled && this.isPlaying) this.startPadSound();
    else if (!enabled) this.stopPadSound();
  }

  private startPadSound() {
    if (this.padSounding) return;
    this.padSounding = true;
    this.padSynth.triggerAttack(MultitrackEngine.PAD_CHORD, undefined, MultitrackEngine.PAD_VELOCITY);
    this.padLoopId = Tone.getTransport().scheduleRepeat(() => {
      this.padSynth.triggerRelease(MultitrackEngine.PAD_CHORD);
      this.padSynth.triggerAttack(MultitrackEngine.PAD_CHORD, undefined, MultitrackEngine.PAD_VELOCITY);
    }, MultitrackEngine.PAD_LOOP_SECONDS);
  }

  private stopPadSound() {
    if (this.padLoopId !== null) {
      Tone.getTransport().clear(this.padLoopId);
      this.padLoopId = null;
    }
    if (this.padSounding) {
      this.padSynth.releaseAll();
      this.padSounding = false;
    }
  }

  setPadVolume(volume: number) {
    this.padVolumeValue = volume;
    this.padGain.gain.rampTo(volume, 0.05);
  }

  getPadVolume(): number {
    return this.padGain.gain.value;
  }

  getPadLevel(): number {
    const value = this.padMeter.getValue();
    return typeof value === "number" ? value : 0;
  }

  getPadDb(): number {
    const value = this.padMeterDb.getValue();
    return typeof value === "number" ? value : -Infinity;
  }

  isPadClipping(): boolean {
    return this.getPadDb() >= CLIP_THRESHOLD_DB;
  }

  private metronomeIntervalSeconds(): number {
    return 60 / this.metronomeBpm / TICKS_PER_BEAT[this.metronomeSubdivision];
  }

  setMetronome(enabled: boolean) {
    if (enabled && this.metronomeEventId === null) {
      // A plain-seconds interval (not a "4n" subdivision) keeps the click's
      // timing off Transport.bpm entirely, so it never moves when the song's
      // own playback-rate ("Tempo") changes.
      this.metronomeEventId = Tone.getTransport().scheduleRepeat((time) => {
        this.triggerMetronomeClick(time);
      }, this.metronomeIntervalSeconds());
    } else if (!enabled && this.metronomeEventId !== null) {
      Tone.getTransport().clear(this.metronomeEventId);
      this.metronomeEventId = null;
    }
  }

  private rescheduleMetronomeIfActive() {
    if (this.metronomeEventId !== null) {
      // scheduleRepeat's interval is fixed at call time — re-schedule so a
      // live change takes effect immediately instead of on the next toggle.
      Tone.getTransport().clear(this.metronomeEventId);
      this.metronomeEventId = Tone.getTransport().scheduleRepeat((time) => {
        this.triggerMetronomeClick(time);
      }, this.metronomeIntervalSeconds());
    }
  }

  setMetronomeBpm(bpm: number) {
    this.metronomeBpm = bpm > 0 ? bpm : 120;
    this.rescheduleMetronomeIfActive();
  }

  setMetronomeSubdivision(subdivision: MetronomeSubdivision) {
    this.metronomeSubdivision = subdivision;
    this.rescheduleMetronomeIfActive();
  }

  get isPadOn(): boolean {
    return this.padOnFlag;
  }

  get isMetronomeOn(): boolean {
    return this.metronomeEventId !== null;
  }

  get duration(): number {
    let max = 0;
    for (const node of this.nodes.values()) {
      if (node.player.buffer.duration > max) max = node.player.buffer.duration;
    }
    return max;
  }

  async loadTracks(tracks: ITrackLoadInput[], onTrackLoaded?: () => void) {
    // Only tears down this song's own track nodes — never the transport, the
    // Click or the Pad, which are meant to keep going across a song swap
    // (see finishSequence()) since they're independent of any one song.
    this.disposeTracks();
    await Tone.start();

    const loadOne = (track: ITrackLoadInput) =>
      new Promise<void>((resolve, reject) => {
        const meter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });
        const meterDb = new Tone.Meter({ normalRange: false, smoothing: 0.6 });
        const sendGain = new Tone.Gain(0).connect(this.reverb);
        const compressor = new Tone.Compressor({ threshold: 0, ratio: 1 });
        const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
        const panner = new Tone.Panner(track.pan);
        const pitchShift = new Tone.PitchShift();
        const phaseGain = new Tone.Gain(track.isPhaseInverted ? -1 : 1);
        const gain = new Tone.Gain(track.volume);

        compressor.connect(eq);
        eq.connect(meter);
        eq.connect(meterDb);
        eq.connect(this.masterGain);
        eq.connect(sendGain);
        panner.connect(compressor);
        pitchShift.connect(panner);
        phaseGain.connect(pitchShift);
        gain.connect(phaseGain);

        const player = new Tone.Player({
          url: track.url,
          fadeIn: FADE_SECONDS,
          fadeOut: FADE_SECONDS,
          onload: () => {
            onTrackLoaded?.();
            resolve();
          },
          onerror: (err) => reject(err),
        }).connect(gain);
        player.sync().start(0);

        this.nodes.set(track.id, {
          player,
          gain,
          phaseGain,
          pitchShift,
          panner,
          eq,
          compressor,
          sendGain,
          meter,
          meterDb,
        });
      });

    // Load a limited number of tracks concurrently to avoid exhausting
    // browser memory/network resources when a song has many large tracks.
    const queue = [...tracks];
    const workerCount = Math.min(MAX_CONCURRENT_TRACK_LOADS, queue.length);
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (queue.length > 0) {
          const track = queue.shift();
          if (!track) return;
          await loadOne(track);
        }
      }),
    );

    this.applySoloState(tracks);
    this.loaded = true;
  }

  private applySoloState(tracks: ITrackMixState[]) {
    this.lastMixState = tracks;
    const anySolo = tracks.some((t) => t.isSolo);
    for (const track of tracks) {
      const node = this.nodes.get(track.id);
      if (!node) continue;
      const audible = anySolo ? track.isSolo : !track.isMuted;
      node.player.mute = !audible;
    }
  }

  /** Restores each track's correct mute/solo state after finishSequence()
   * force-muted everything — used when resuming into the same song instead
   * of moving on to the next one (e.g. the user rewinds after the end). */
  private resumeTracks() {
    this.applySoloState(this.lastMixState);
  }

  getTrackLevel(id: number): number {
    const node = this.nodes.get(id);
    if (!node) return 0;
    const value = node.meter.getValue();
    return typeof value === "number" ? value : 0;
  }

  getTrackDb(id: number): number {
    const node = this.nodes.get(id);
    if (!node) return -Infinity;
    const value = node.meterDb.getValue();
    return typeof value === "number" ? value : -Infinity;
  }

  isTrackClipping(id: number): boolean {
    return this.getTrackDb(id) >= CLIP_THRESHOLD_DB;
  }

  setTrackVolume(id: number, volume: number) {
    const node = this.nodes.get(id);
    if (node) node.gain.gain.rampTo(volume, 0.05);
  }

  /** Current (possibly mid-ramp) gain value — used to drive the fader's
   * visual position so it actually moves during an F-key fade, not just
   * the VU meter. */
  getTrackVolume(id: number): number {
    return this.nodes.get(id)?.gain.gain.value ?? 0;
  }

  getMetronomeVolume(): number {
    return this.metronomeGain.gain.value;
  }

  setTrackPan(id: number, pan: number) {
    const node = this.nodes.get(id);
    if (node) node.panner.pan.rampTo(pan, 0.05);
  }

  setTrackPhaseInverted(id: number, inverted: boolean) {
    const node = this.nodes.get(id);
    if (node) node.phaseGain.gain.value = inverted ? -1 : 1;
  }

  setTrackEQ(id: number, band: { low?: number; mid?: number; high?: number }) {
    const node = this.nodes.get(id);
    if (!node) return;
    if (band.low !== undefined) node.eq.low.value = band.low;
    if (band.mid !== undefined) node.eq.mid.value = band.mid;
    if (band.high !== undefined) node.eq.high.value = band.high;
  }

  setTrackCompressor(id: number, options: { enabled: boolean; threshold?: number; ratio?: number }) {
    const node = this.nodes.get(id);
    if (!node) return;
    if (!options.enabled) {
      node.compressor.threshold.value = 0;
      node.compressor.ratio.value = 1;
      return;
    }
    node.compressor.threshold.value = options.threshold ?? -24;
    node.compressor.ratio.value = options.ratio ?? 4;
  }

  setTrackReverbSend(id: number, level: number) {
    const node = this.nodes.get(id);
    if (node) node.sendGain.gain.rampTo(level, 0.05);
  }

  setTrackMixState(tracks: ITrackMixState[]) {
    this.applySoloState(tracks);
  }

  getMasterLevel(): number {
    const value = this.masterMeter.getValue();
    return typeof value === "number" ? value : 0;
  }

  getMasterDb(): number {
    const value = this.masterMeterDb.getValue();
    return typeof value === "number" ? value : -Infinity;
  }

  isMasterClipping(): boolean {
    return this.getMasterDb() >= CLIP_THRESHOLD_DB;
  }

  getMetronomeLevel(): number {
    const value = this.metronomeMeter.getValue();
    return typeof value === "number" ? value : 0;
  }

  getMetronomeDb(): number {
    const value = this.metronomeMeterDb.getValue();
    return typeof value === "number" ? value : -Infinity;
  }

  isMetronomeClipping(): boolean {
    return this.getMetronomeDb() >= CLIP_THRESHOLD_DB;
  }

  setMetronomeVolume(volume: number) {
    this.metronomeVolumeValue = volume;
    this.metronomeGain.gain.rampTo(volume, 0.05);
  }

  setMasterVolume(volume: number) {
    this.masterGain.gain.rampTo(volume, 0.05);
  }

  fadeMasterTo(target: number, seconds: number) {
    this.masterGain.gain.rampTo(target, seconds);
  }

  /** Fades every track's own gain (not just the master bus) so channel VU
   * meters — which tap the signal upstream of masterGain — visibly move too. */
  fadeTracksOut(seconds: number) {
    for (const [id, node] of this.nodes) {
      this.preFadeTrackVolumes.set(id, node.gain.gain.value);
      node.gain.gain.rampTo(0, seconds);
    }
    this.metronomeGain.gain.rampTo(0, seconds);
    this.padGain.gain.rampTo(0, seconds);
  }

  fadeTracksIn(seconds: number) {
    for (const [id, node] of this.nodes) {
      const target = this.preFadeTrackVolumes.get(id);
      if (target !== undefined) node.gain.gain.rampTo(target, seconds);
    }
    this.metronomeGain.gain.rampTo(this.metronomeVolumeValue, seconds);
    this.padGain.gain.rampTo(this.padVolumeValue, seconds);
  }

  setPitch(semitones: number) {
    for (const node of this.nodes.values()) node.pitchShift.pitch = semitones;
  }

  setTempo(playbackRate: number) {
    this.playbackRate = playbackRate;
    for (const node of this.nodes.values()) node.player.playbackRate = playbackRate;
  }

  setLoop(loop: boolean, start = 0, end?: number) {
    Tone.getTransport().loop = loop;
    Tone.getTransport().loopStart = start;
    Tone.getTransport().loopEnd = end ?? this.duration;
  }

  play() {
    if (!this.loaded) return;
    this.resumeTracks();
    // Transport may already be running if Click/Pad carried over from a
    // previous song (finishSequence() never paused it) — starting an
    // already-started transport throws in Tone.js.
    if (Tone.getTransport().state !== "started") Tone.getTransport().start();
    if (this.padOnFlag) this.startPadSound();
  }

  pause() {
    Tone.getTransport().pause();
    this.stopPadSound();
  }

  stop() {
    Tone.getTransport().stop();
    Tone.getTransport().seconds = 0;
    this.stopPadSound();
  }

  seekTo(seconds: number) {
    this.resumeTracks();
    Tone.getTransport().seconds = Math.max(0, Math.min(seconds, this.duration));
  }

  /** Rewinds the transport to 0 without touching the Click/Pad schedules or
   * their sounding state — used when a new song's tracks finish loading,
   * since every track is synced to start at transport position 0. */
  resetPosition() {
    Tone.getTransport().seconds = 0;
  }

  /** Called when a song's sequence naturally plays through to its end.
   * Silences this song's own tracks (so nothing keeps playing past the
   * arranged "Final" section) but — unlike pause()/stop() — leaves the
   * transport running when Click or Pad are on, since those loop
   * independently of any one song and are meant to keep sounding through
   * the gap until the next song in the queue takes over. */
  finishSequence() {
    for (const node of this.nodes.values()) node.player.mute = true;
    if (!this.padOnFlag && this.metronomeEventId === null) {
      Tone.getTransport().pause();
    }
  }

  get currentTime(): number {
    return Tone.getTransport().seconds;
  }

  get isPlaying(): boolean {
    return Tone.getTransport().state === "started";
  }

  /** Tears down only this song's own track nodes — the part that genuinely
   * needs replacing on every song swap. Click/Pad/transport are untouched,
   * since (per finishSequence()) they're meant to survive across songs. */
  private disposeTracks() {
    for (const node of this.nodes.values()) {
      node.player.unsync();
      node.player.dispose();
      node.gain.dispose();
      node.phaseGain.dispose();
      node.pitchShift.dispose();
      node.panner.dispose();
      node.eq.dispose();
      node.compressor.dispose();
      node.sendGain.dispose();
      node.meter.dispose();
      node.meterDb.dispose();
    }
    this.nodes.clear();
    this.loaded = false;
  }

  /** Full teardown, including the transport, Click and Pad — only for
   * genuinely leaving the player altogether (not for a normal song swap,
   * which uses loadTracks()/disposeTracks() instead so Click/Pad can keep
   * sounding across songs). */
  dispose() {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    // Transport.cancel() wipes every scheduled event, including the click's
    // and pad's own scheduleRepeat — without nulling these too, setMetronome/
    // setPadOn would believe a (now-cancelled) schedule is still active and
    // silently refuse to reschedule it after loading the next song.
    this.metronomeEventId = null;
    this.padLoopId = null;
    // Transport.cancel() only removes the *scheduled retriggers* — a chord
    // already mid-sustain from triggerAttack() keeps ringing on its own
    // envelope regardless, since it was never tied to the Transport clock.
    // Force it silent now so it can't audibly bleed into whatever loads next.
    this.padSynth.releaseAll();
    this.padSounding = false;
    this.disposeTracks();
  }
}

let sharedEngine: MultitrackEngine | null = null;

/** The engine is a true singleton (one per browser tab), not tied to any
 * single song page's component lifecycle. Song pages remount on every
 * navigation (each song is its own route), but Click/Pad are meant to keep
 * sounding across that navigation — so the audio graph that produces them
 * has to live longer than the component that happens to be driving it. */
export function getSharedMultitrackEngine(): MultitrackEngine {
  if (!sharedEngine) sharedEngine = new MultitrackEngine();
  return sharedEngine;
}
