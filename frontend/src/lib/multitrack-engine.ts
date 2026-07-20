import * as Tone from "tone";

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
  private baseBpm = 120;
  private playbackRate = 1;

  private masterGain = new Tone.Gain(1);
  private limiter = new Tone.Limiter(-1);
  private masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });
  private masterMeterDb = new Tone.Meter({ normalRange: false, smoothing: 0.6 });
  private reverb = new Tone.Reverb({ decay: 2.2, wet: 1 });
  private metronomeSynth = new Tone.MembraneSynth({
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.01 },
  });
  private metronomeEventId: number | null = null;

  constructor() {
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.masterMeter);
    this.limiter.connect(this.masterMeterDb);
    this.limiter.toDestination();
    this.reverb.connect(this.masterGain);
    this.metronomeSynth.connect(this.masterGain);
    void this.reverb.generate();
  }

  setMetronome(enabled: boolean) {
    if (enabled && this.metronomeEventId === null) {
      this.metronomeEventId = Tone.getTransport().scheduleRepeat((time) => {
        this.metronomeSynth.triggerAttackRelease("C5", "16n", time);
      }, "4n");
    } else if (!enabled && this.metronomeEventId !== null) {
      Tone.getTransport().clear(this.metronomeEventId);
      this.metronomeEventId = null;
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

  setMasterVolume(volume: number) {
    this.masterGain.gain.rampTo(volume, 0.05);
  }

  fadeMasterTo(target: number, seconds: number) {
    this.masterGain.gain.rampTo(target, seconds);
  }

  setPitch(semitones: number) {
    for (const node of this.nodes.values()) node.pitchShift.pitch = semitones;
  }

  setBaseBpm(bpm: number) {
    this.baseBpm = bpm > 0 ? bpm : 120;
    Tone.getTransport().bpm.value = this.baseBpm * this.playbackRate;
  }

  setTempo(playbackRate: number) {
    this.playbackRate = playbackRate;
    Tone.getTransport().bpm.value = this.baseBpm * playbackRate;
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
