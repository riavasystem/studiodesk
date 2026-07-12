import * as Tone from "tone";

interface ITrackNode {
  player: Tone.Player;
  gain: Tone.Gain;
  pitchShift: Tone.PitchShift;
  meter: Tone.Meter;
}

const FADE_SECONDS = 0.05;

export class MultitrackEngine {
  private nodes = new Map<number, ITrackNode>();
  private loaded = false;
  private masterGain = new Tone.Gain(1).toDestination();
  private masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });

  constructor() {
    this.masterGain.connect(this.masterMeter);
  }

  get duration(): number {
    let max = 0;
    for (const node of this.nodes.values()) {
      if (node.player.buffer.duration > max) max = node.player.buffer.duration;
    }
    return max;
  }

  async loadTracks(tracks: { id: number; url: string; volume: number; isMuted: boolean; isSolo: boolean }[]) {
    this.dispose();
    await Tone.start();

    await Promise.all(
      tracks.map(
        (track) =>
          new Promise<void>((resolve, reject) => {
            const meter = new Tone.Meter({ normalRange: true, smoothing: 0.8 });
            const pitchShift = new Tone.PitchShift().connect(meter).connect(this.masterGain);
            const gain = new Tone.Gain(track.volume).connect(pitchShift);
            const player = new Tone.Player({
              url: track.url,
              fadeIn: FADE_SECONDS,
              fadeOut: FADE_SECONDS,
              onload: () => resolve(),
              onerror: (err) => reject(err),
            }).connect(gain);
            player.sync().start(0);
            this.nodes.set(track.id, { player, gain, pitchShift, meter });
          }),
      ),
    );

    this.applySoloState(tracks);
    this.loaded = true;
  }

  private applySoloState(tracks: { id: number; isMuted: boolean; isSolo: boolean }[]) {
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

  setTrackVolume(id: number, volume: number) {
    const node = this.nodes.get(id);
    if (node) node.gain.gain.rampTo(volume, 0.05);
  }

  getMasterLevel(): number {
    const value = this.masterMeter.getValue();
    return typeof value === "number" ? value : 0;
  }

  setMasterVolume(volume: number) {
    this.masterGain.gain.rampTo(volume, 0.05);
  }

  setTrackMixState(tracks: { id: number; isMuted: boolean; isSolo: boolean }[]) {
    this.applySoloState(tracks);
  }

  setPitch(semitones: number) {
    for (const node of this.nodes.values()) node.pitchShift.pitch = semitones;
  }

  setTempo(playbackRate: number) {
    Tone.getTransport().bpm.value = 120 * playbackRate;
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
      node.pitchShift.dispose();
      node.meter.dispose();
    }
    this.nodes.clear();
    this.loaded = false;
  }
}
