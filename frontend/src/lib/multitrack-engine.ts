import * as Tone from "tone";

export type MetronomeSoundId = "clock" | "beep" | "wood" | "hihat";

export const METRONOME_SOUND_OPTIONS: { id: MetronomeSoundId; label: string }[] = [
  { id: "clock", label: "Reloj" },
  { id: "beep", label: "Beep" },
  { id: "wood", label: "Madera" },
  { id: "hihat", label: "Hi-Hat" },
];

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
  private metronomeVolumeValue = 1;

  // Ambient synth pad — a sustained chord re-triggered every few seconds
  // while enabled, giving a harmonic bed under the song.
  private padSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 1.2, decay: 0.3, sustain: 0.8, release: 1.5 },
  });
  private padGain = new Tone.Gain(0.6);
  private padMeter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });
  private padMeterDb = new Tone.Meter({ normalRange: false, smoothing: 0.6 });
  private padLoopId: number | null = null;
  private padVolumeValue = 0.6;
  private static readonly PAD_CHORD = ["C3", "E3", "G3", "B3"];
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
    this.padSynth.connect(this.padGain);
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

  setPadOn(enabled: boolean) {
    if (enabled && this.padLoopId === null) {
      this.padSynth.triggerAttack(MultitrackEngine.PAD_CHORD);
      this.padLoopId = Tone.getTransport().scheduleRepeat(() => {
        this.padSynth.triggerRelease(MultitrackEngine.PAD_CHORD);
        this.padSynth.triggerAttack(MultitrackEngine.PAD_CHORD);
      }, MultitrackEngine.PAD_LOOP_SECONDS);
    } else if (!enabled && this.padLoopId !== null) {
      Tone.getTransport().clear(this.padLoopId);
      this.padSynth.releaseAll();
      this.padLoopId = null;
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

  setMetronome(enabled: boolean) {
    if (enabled && this.metronomeEventId === null) {
      // A plain-seconds interval (not a "4n" subdivision) keeps the click's
      // timing off Transport.bpm entirely, so it never moves when the song's
      // own playback-rate ("Tempo") changes.
      this.metronomeEventId = Tone.getTransport().scheduleRepeat((time) => {
        this.triggerMetronomeClick(time);
      }, 60 / this.metronomeBpm);
    } else if (!enabled && this.metronomeEventId !== null) {
      Tone.getTransport().clear(this.metronomeEventId);
      this.metronomeEventId = null;
    }
  }

  setMetronomeBpm(bpm: number) {
    this.metronomeBpm = bpm > 0 ? bpm : 120;
    if (this.metronomeEventId !== null) {
      // scheduleRepeat's interval is fixed at call time — re-schedule so a
      // live change takes effect immediately instead of on the next toggle.
      Tone.getTransport().clear(this.metronomeEventId);
      this.metronomeEventId = Tone.getTransport().scheduleRepeat((time) => {
        this.triggerMetronomeClick(time);
      }, 60 / this.metronomeBpm);
    }
  }

  get duration(): number {
    let max = 0;
    for (const node of this.nodes.values()) {
      if (node.player.buffer.duration > max) max = node.player.buffer.duration;
    }
    return max;
  }

  async loadTracks(tracks: ITrackLoadInput[], onTrackLoaded?: () => void) {
    this.dispose();
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
    const anySolo = tracks.some((t) => t.isSolo);
    for (const track of tracks) {
      const node = this.nodes.get(track.id);
      if (!node) continue;
      const audible = anySolo ? track.isSolo : !track.isMuted;
      node.player.mute = !audible;
    }
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
    Tone.getTransport().start();
  }

  pause() {
    Tone.getTransport().pause();
  }

  stop() {
    Tone.getTransport().stop();
    Tone.getTransport().seconds = 0;
  }

  seekTo(seconds: number) {
    Tone.getTransport().seconds = Math.max(0, Math.min(seconds, this.duration));
  }

  get currentTime(): number {
    return Tone.getTransport().seconds;
  }

  get isPlaying(): boolean {
    return Tone.getTransport().state === "started";
  }

  dispose() {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
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
}
